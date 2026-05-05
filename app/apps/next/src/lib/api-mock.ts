import { AxiosInstance } from 'axios';
import { demoDB, demoStorage } from './demo-db';
import { v4 as uuidv4 } from 'uuid';
import { addWatermarkAndQRBrowser } from './pdf-demo';

export function setupApiMock(api: AxiosInstance) {
  // Check if demo mode is enabled
  const isDemo = typeof window !== 'undefined' && 
    (localStorage.getItem('portex_demo_mode') === 'true' || 
     window.location.hostname.includes('demo') ||
     process.env.NEXT_PUBLIC_DEMO_MODE === 'true');

  if (!isDemo) return;

  console.log('🚀 PortEx is running in DEMO MODE (LocalStorage & IndexedDB)');

  // Intercept requests and return mock data via adapter
  api.interceptors.request.use(async (config) => {
    // Normalize URL: remove origin if present, remove leading slash for consistency
    let url = config.url || '';
    const method = config.method?.toLowerCase();
    const { data, params } = config;

    // Helper for successful response
    const success = (data: any) => ({
      data: { success: true, data },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    let mockResponse: any = null;

    // --- AUTH ---
    if (url.includes('/api/auth/login') && method === 'post') {
      const users = demoDB.get<any>('users');
      const user = users.find((u: any) => u.email === data.email);
      
      // Determine role based on email if user not found in mock DB
      let role = 'OFFICER';
      if (data.email?.toLowerCase().includes('admin')) role = 'ADMIN';
      else if (data.email?.toLowerCase().includes('manager')) role = 'MANAGER';
      else if (data.email?.toLowerCase().includes('auditor')) role = 'AUDITOR';

      mockResponse = success({
        user: user || {
          id: `demo-${role.toLowerCase()}`,
          firstName: 'Demo',
          lastName: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
          email: data.email || `${role.toLowerCase()}@portex.app`,
          role: role,
          active: true,
          createdAt: new Date().toISOString()
        },
        tokens: { access_token: 'demo-token', refresh_token: 'demo-refresh' }
      });
    }

    else if (url.includes('/api/auth/register') && method === 'post') {
      const newUser = {
        id: uuidv4(),
        ...data,
        firstName: data.first_name || data.firstName,
        lastName: data.last_name || data.lastName,
        role: 'OFFICER',
        active: true,
        createdAt: new Date().toISOString()
      };
      demoDB.insert('users', newUser);
      mockResponse = success({
        user: newUser,
        tokens: { access_token: 'demo-token', refresh_token: 'demo-refresh' }
      });
    }

    // --- DOCUMENTS ---
    else if (url.endsWith('/api/documents') && method === 'get') {
      const docs = demoDB.get<any>('documents');
      mockResponse = success(docs);
    }

    else if (url.endsWith('/api/documents') && method === 'post') {
      let docData: any = {};
      
      if (data instanceof FormData) {
        docData.title = data.get('title');
        docData.notes = data.get('notes');
        
        const fileFields = ['po_file', 'invoice_file', 'packing_list_file', 'peb_file', 'bl_file', 'other_file'];
        for (const field of fileFields) {
          const file = data.get(field) as File;
          if (file && file.size > 0) {
            const path = `demo_uploads/${field}/${uuidv4()}_${file.name}`;
            docData[field.replace('_file', 'Path')] = path;
            await demoStorage.saveFile(path, file);
          }
        }
      } else {
        docData = data;
      }

      const newDoc = {
        ...docData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        status: docData.status || 'Draft',
        uploader: {
          id: 'demo-user',
          firstName: 'Demo',
          lastName: 'User',
          email: 'demo@portex.app'
        }
      };
      
      demoDB.insert('documents', newDoc);
      
      demoDB.insert('audit_logs', {
        id: uuidv4(),
        action: 'UPLOAD_DOCUMENT',
        details: `Dokumen dibuat dengan judul: ${newDoc.title}`,
        userId: 'demo-user',
        documentId: newDoc.id,
        createdAt: new Date().toISOString()
      });

      mockResponse = success(newDoc);
    }

    else if (url.includes('/api/documents/') && method === 'get' && !url.includes('/download')) {
      const parts = url.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      const docs = demoDB.get<any>('documents');
      const doc = docs.find((d: any) => d.id === id);
      mockResponse = success(doc);
    }

    else if (url.includes('/download') && method === 'get') {
      const parts = url.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      const type = params?.type || 'po';
      
      const docs = demoDB.get<any>('documents');
      const doc = docs.find((d: any) => d.id === id);
      const path = doc ? doc[`${type}Path`] : null;

      if (path) {
        const blob = await demoStorage.getFile(path);
        if (blob) {
          mockResponse = { ...success(blob), data: blob };
        }
      }
      if (!mockResponse) {
        mockResponse = { status: 404, data: { message: 'File not found' }, headers: {}, config };
      }
    }

    else if (url.includes('/approve') && method === 'post') {
      const parts = url.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      const notes = data instanceof FormData ? data.get('manager_notes') : data.manager_notes;
      const updated = demoDB.update<any>('documents', id, { 
        status: 'Approved',
        managerNotes: notes 
      });
      
      demoDB.insert('audit_logs', {
        id: uuidv4(),
        action: 'APPROVE_LEVEL_1',
        details: `Dokumen disetujui oleh MANAGER${notes ? ` | Catatan: ${notes}` : ''}`,
        userId: 'demo-user',
        documentId: id,
        createdAt: new Date().toISOString()
      });

      mockResponse = success(updated);
    }

    else if (url.includes('/lock') && method === 'post') {
      const parts = url.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      
      const docs = demoDB.get<any>('documents');
      const doc = docs.find((d: any) => d.id === id);

      const notes = data instanceof FormData ? data.get('manager_notes') : data.manager_notes;
      const updated = demoDB.update<any>('documents', id, { 
        status: 'Locked',
        managerNotes: notes || doc?.managerNotes
      });
      
      demoDB.insert('audit_logs', {
        id: uuidv4(),
        action: 'APPROVE_FINAL',
        details: `Dokumen dikunci oleh MANAGER${notes ? ` | Catatan: ${notes}` : ''}`,
        userId: 'demo-user',
        documentId: id,
        createdAt: new Date().toISOString()
      });

      mockResponse = success(updated);
    }

    // --- AUDIT LOGS ---
    else if ((url.includes('/api/audit_logs') || url.includes('/api/audit-logs')) && method === 'get') {
      const logs = demoDB.get<any>('audit_logs');
      const docId = params?.document_id || params?.documentId;
      if (docId) {
        mockResponse = success(logs.filter((l: any) => l.documentId === docId));
      } else {
        mockResponse = success(logs);
      }
    }

    // --- USERS ---
    else if (url.includes('/api/users') && method === 'get') {
      const users = demoDB.get<any>('users');
      mockResponse = success(users);
    }

    else if (url.endsWith('/api/users') && method === 'post') {
      const newUser = {
        id: uuidv4(),
        ...data,
        firstName: data.first_name || data.firstName,
        lastName: data.last_name || data.lastName,
        active: true,
        createdAt: new Date().toISOString()
      };
      demoDB.insert('users', newUser);
      mockResponse = success(newUser);
    }

    else if (url.includes('/api/users/') && (method === 'put' || method === 'patch')) {
      const parts = url.split('/');
      const id = parts[parts.indexOf('users') + 1];
      const updated = demoDB.update<any>('users', id, {
        ...data,
        firstName: data.first_name || data.firstName,
        lastName: data.last_name || data.lastName,
      });
      mockResponse = success(updated);
    }

    else if (url.includes('/api/users/') && method === 'delete') {
      const parts = url.split('/');
      const id = parts[parts.indexOf('users') + 1];
      demoDB.delete('users', id);
      mockResponse = success({ success: true });
    }

    // --- SETTINGS ---
    else if (url.includes('/api/settings') && method === 'get') {
      const settings = demoDB.get<any>('settings');
      if (settings.length === 0) {
        const defaultSettings = [
          { key: 'retention_years', value: '10' },
          { key: 'watermark_text', value: 'LOCKED BY {user} - {date}' }
        ];
        demoDB.set('settings', defaultSettings);
        mockResponse = success(defaultSettings);
      } else {
        mockResponse = success(settings);
      }
    }

    else if (url.includes('/api/settings') && method === 'put') {
      const { key, value } = data;
      const settings = demoDB.get<any>('settings');
      const index = settings.findIndex((s: any) => s.key === key);
      
      if (index > -1) {
        settings[index].value = value;
      } else {
        settings.push({ key, value });
      }
      
      demoDB.set('settings', settings);
      mockResponse = success(settings);
    }

    // --- OTHER DOCUMENT ACTIONS ---
    else if (url.includes('/api/documents/') && (method === 'put' || method === 'patch')) {
      const parts = url.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      const updated = demoDB.update<any>('documents', id, data);
      mockResponse = success(updated);
    }

    else if (url.includes('/api/documents/') && method === 'delete') {
      const parts = url.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      demoDB.delete('documents', id);
      mockResponse = success({ success: true });
    }

    if (mockResponse) {
      console.log(`[Demo Mock] ${method?.toUpperCase()} ${url}`, mockResponse.data);
      config.adapter = async () => mockResponse;
    }

    return config;
  });
}
