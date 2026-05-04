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
    const { url, method, data, params } = config;

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
    if (url === '/api/auth/login' && method === 'post') {
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

    // --- DOCUMENTS ---
    else if (url === '/api/documents' && method === 'get') {
      const docs = demoDB.get<any>('documents');
      mockResponse = success(docs);
    }

    else if (url === '/api/documents' && method === 'post') {
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
        details: `Uploaded document: ${newDoc.title}`,
        userId: 'demo-user',
        createdAt: new Date().toISOString()
      });

      mockResponse = success(newDoc);
    }

    else if (url?.startsWith('/api/documents/') && method === 'get' && !url.includes('/download')) {
      const id = url.split('/').pop();
      const docs = demoDB.get<any>('documents');
      const doc = docs.find((d: any) => d.id === id);
      mockResponse = success(doc);
    }

    else if (url?.includes('/download') && method === 'get') {
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

    else if (url?.includes('/approve') && method === 'post') {
      const parts = url.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      const updated = demoDB.update<any>('documents', id, { 
        status: 'Approved',
        managerNotes: data.notes 
      });
      
      demoDB.insert('audit_logs', {
        id: uuidv4(),
        action: 'APPROVE_LEVEL_1',
        details: `Approved document (Level 1): ${updated?.title}`,
        userId: 'demo-user',
        documentId: id,
        createdAt: new Date().toISOString()
      });

      mockResponse = success(updated);
    }

    else if (url?.includes('/lock') && method === 'post') {
      const parts = url.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      
      const docs = demoDB.get<any>('documents');
      const doc = docs.find((d: any) => d.id === id);

      if (doc && doc.poPath) {
        try {
          const blob = await demoStorage.getFile(doc.poPath);
          if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const qrText = `PORTEX-DEMO-${doc.id}`;
            const watermarkText = `LOCKED BY DEMO ADMIN - ${new Date().toLocaleDateString('id-ID')}`;
            
            const processedBytes = await addWatermarkAndQRBrowser(arrayBuffer, qrText, watermarkText);
            const processedBlob = new Blob([processedBytes], { type: 'application/pdf' });
            
            await demoStorage.saveFile(doc.poPath, processedBlob);
          }
        } catch (err) {
          console.error('Error processing PDF in demo mode:', err);
        }
      }

      const updated = demoDB.update<any>('documents', id, { status: 'Locked' });
      
      demoDB.insert('audit_logs', {
        id: uuidv4(),
        action: 'APPROVE_FINAL',
        details: `Locked and watermarked document (Demo): ${updated?.title}`,
        userId: 'demo-user',
        documentId: id,
        createdAt: new Date().toISOString()
      });

      mockResponse = success(updated);
    }

    // --- AUDIT LOGS ---
    else if (url?.includes('/audit-logs') && method === 'get') {
      const logs = demoDB.get<any>('audit_logs');
      if (params?.documentId) {
        mockResponse = success(logs.filter((l: any) => l.documentId === params.documentId));
      } else {
        mockResponse = success(logs);
      }
    }

    // --- USERS ---
    else if (url === '/api/users' && method === 'get') {
      const users = demoDB.get<any>('users');
      mockResponse = success(users);
    }

    // --- SETTINGS ---
    else if (url === '/api/settings' && method === 'get') {
      const settings = demoDB.get<any>('settings');
      if (settings.length === 0) {
        mockResponse = success([
          { key: 'retention_years', value: '10' },
          { key: 'watermark_text', value: 'CONFIDENTIAL' }
        ]);
      } else {
        mockResponse = success(settings);
      }
    }

    if (mockResponse) {
      console.log(`[Demo Mock] ${method?.toUpperCase()} ${url}`, mockResponse.data);
      config.adapter = async () => mockResponse;
    }

    return config;
  });
}
