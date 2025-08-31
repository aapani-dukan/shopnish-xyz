import axios from 'axios';
import { toast } from '@/hooks/use-toast';

// यहाँ अपने बैकएंड URL को अपडेट करें
const API_BASE_URL = 'http://localhost:3001/api'; 

export const apiRequest = async (method: string, url: string, data: any = null) => {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      data,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'एक अप्रत्याशित त्रुटि हुई।';
    console.error('API अनुरोध में त्रुटि:', errorMessage);
    toast({
      title: 'API अनुरोध विफल',
      description: errorMessage,
      variant: 'destructive',
    });
    throw error;
  }
};
