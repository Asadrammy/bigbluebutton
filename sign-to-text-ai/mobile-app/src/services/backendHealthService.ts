/**
 * Backend Health Check Service
 * Checks if the backend server is running and accessible
 */
import apiService from './api';
import config from '@config/environment';
import axios from 'axios';

export interface BackendHealthStatus {
  isHealthy: boolean;
  message: string;
  apiUrl: string;
  details?: string;
}

class BackendHealthService {
  /**
   * Check if backend is healthy and accessible
   */
  async checkHealth(): Promise<BackendHealthStatus> {
    const apiUrl = config.apiBaseUrl;
    
    try {
      // Try health check endpoint
      const healthData = await apiService.checkBackendHealth();
      
      if (healthData.status === 'healthy') {
        return {
          isHealthy: true,
          message: 'Backend is running',
          apiUrl,
        };
      } else {
        return {
          isHealthy: false,
          message: 'Backend responded but status is not healthy',
          apiUrl,
          details: JSON.stringify(healthData),
        };
      }
    } catch (error: any) {
      // Determine the specific error
      let errorMessage = 'Backend is not reachable';
      let details = '';
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = 'Cannot connect to backend server';
        details = `Connection refused. Please ensure:\n1. Backend is running (python run.py)\n2. Backend URL is correct: ${apiUrl}\n3. Device and computer are on the same network`;
      } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        errorMessage = 'Backend connection timeout';
        details = `Request timed out. The backend may be slow or unreachable.\nAPI URL: ${apiUrl}`;
      } else if (error.message?.includes('Network Error')) {
        errorMessage = 'Network error';
        details = `Network request failed. Check:\n1. Internet connection\n2. Backend is running\n3. API URL: ${apiUrl}`;
      } else {
        details = error.message || 'Unknown error';
      }
      
      return {
        isHealthy: false,
        message: errorMessage,
        apiUrl,
        details,
      };
    }
  }

  /**
   * Get a user-friendly error message with troubleshooting steps
   */
  getErrorMessage(healthStatus: BackendHealthStatus): string {
    if (healthStatus.isHealthy) {
      return '';
    }

    const baseUrl = healthStatus.apiUrl.replace('/api/v1', '');
    const troubleshooting = `
${healthStatus.message}

API URL: ${healthStatus.apiUrl}

Troubleshooting:
1. Ensure backend is running:
   cd backend
   python run.py

2. Verify backend URL is correct:
   - Check .env file in mobile-app/
   - Current URL: ${healthStatus.apiUrl}
   - Backend should be at: ${baseUrl}

3. Test backend in browser:
   ${baseUrl}/health
   Should show: {"status":"healthy",...}

4. Network checks:
   - Device and computer on same Wi-Fi
   - Firewall allows port 8000
   - Try: ping ${new URL(healthStatus.apiUrl).hostname}

${healthStatus.details ? `\nDetails: ${healthStatus.details}` : ''}
    `.trim();

    return troubleshooting;
  }
}

export default new BackendHealthService();



