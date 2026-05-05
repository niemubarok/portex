-- Seed users
INSERT INTO users (id, first_name, last_name, email, password, role, active, created_at, updated_at)
VALUES 
(gen_random_uuid(), 'Admin', 'User', 'admin@example.com', '$2b$10$Ayz2nC5JXX/XjpQ.oozGPecmSeX9I2ku5BmX3GO3ajf9S2Nla9g6a', 'ADMIN', true, NOW(), NOW()),
(gen_random_uuid(), 'Officer', 'User', 'officer@example.com', '$2b$10$Ayz2nC5JXX/XjpQ.oozGPecmSeX9I2ku5BmX3GO3ajf9S2Nla9g6a', 'OFFICER', true, NOW(), NOW()),
(gen_random_uuid(), 'Manager', 'User', 'manager@example.com', '$2b$10$Ayz2nC5JXX/XjpQ.oozGPecmSeX9I2ku5BmX3GO3ajf9S2Nla9g6a', 'MANAGER', true, NOW(), NOW()),
(gen_random_uuid(), 'Auditor', 'User', 'auditor@example.com', '$2b$10$Ayz2nC5JXX/XjpQ.oozGPecmSeX9I2ku5BmX3GO3ajf9S2Nla9g6a', 'AUDITOR', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET 
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Seed default settings
INSERT INTO settings (key, value, updated_at)
VALUES ('retention_years', '10', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
