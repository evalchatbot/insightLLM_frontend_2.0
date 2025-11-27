import { currentUser } from "@clerk/nextjs/server";
import { getChatHistory } from "@/actions/actions";
import { redirect } from "next/navigation";
import MsgLoader from "@/components/chat-provider-components/msg-loader";
import OptimisticChat from "@/components/chat-provider-components/optimistic-chat";
import SetConversationID from "@/components/chat-provider-components/set-conversation-id";

const Page = async ({ params }: { params: { chat: string } }) => {
  console.log(`Chat page rendered for chatID: ${params.chat}`);
  const user = await currentUser();

  if (!user) {
    redirect("/app")
  }

  const fetchedData = await getChatHistory({
    chatID: params.chat,
    userID: user?.id as string,
  })

  // If chat doesn't exist yet (new chat), start with empty messages
  const message = fetchedData.success ? fetchedData.message : [];
  const conversationID = fetchedData.success ? fetchedData.conversationID : null;
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
  const image = user.imageUrl;

  return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-32 sm:pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <SetConversationID conversationID={conversationID ?? null} />
        <OptimisticChat message={message} name={name} image={image} />
        <MsgLoader name={name} image={image} />
      </div>
  );
};

export default Page
