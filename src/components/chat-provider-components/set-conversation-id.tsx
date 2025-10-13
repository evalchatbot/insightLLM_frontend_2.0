'use client';

import { useEffect } from 'react';
import insightZustand from '@/utils/insight-zustand';

const SetConversationID = ({ conversationID }: { conversationID: string | null }) => {
  const setConversationID = insightZustand((state) => state.setConversationID);

  useEffect(() => {
    setConversationID(conversationID);
  }, [conversationID, setConversationID]);

  return null;
};

export default SetConversationID;
