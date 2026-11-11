import { describe, it, expect } from '@jest/globals';
import { notifyStaff, getMyNotifications } from '../services/notificationService.js';
import pool from '../config/db.js';

describe('Diagnóstico de Notificações In-App e Staff', () => {
  it('deve verificar a estrutura das funções de notificação', () => {
    expect(typeof notifyStaff).toBe('function');
    expect(typeof getMyNotifications).toBe('function');
  });
});

