import { useState, useEffect, useCallback } from 'react';
import { getSidebarChat } from '@/actions/actions';
import { useUser } from '@clerk/nextjs';

export const useSidebarData = () => {
  const { user } = useUser();
  const [sidebarData, setSidebarData] = useState<any>({ success: false, message: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSidebarData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSidebarChat(user.id);
      setSidebarData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sidebar data');
      console.error('Error fetching sidebar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchSidebarData();
  }, [fetchSidebarData]);

  // Function to refresh sidebar data
  const refreshSidebar = useCallback(() => {
    fetchSidebarData();
  }, [fetchSidebarData]);

  // Function to update a specific chat in the sidebar without refetching
  const updateChatInSidebar = useCallback((chatID: string, updates: any) => {
    setSidebarData((prevData: any) => {
      if (!prevData.success || !prevData.message) return prevData;
      
      const updatedMessage = prevData.message.map((item: any) => {
        if (item.chatID === chatID) {
          return {
            ...item,
            chatInfo: {
              ...item.chatInfo,
              ...updates
            }
          };
        }
        return item;
      });
      
      return {
        ...prevData,
        message: updatedMessage
      };
    });
  }, []);

  // Function to remove a chat from sidebar without refetching
  const removeChatFromSidebar = useCallback((chatID: string) => {
    setSidebarData((prevData: any) => {
      if (!prevData.success || !prevData.message) return prevData;
      
      const filteredMessage = prevData.message.filter((item: any) => item.chatID !== chatID);
      
      return {
        ...prevData,
        message: filteredMessage
      };
    });
  }, []);

  return {
    sidebarData,
    isLoading,
    error,
    refreshSidebar,
    updateChatInSidebar,
    removeChatFromSidebar
  };
};
