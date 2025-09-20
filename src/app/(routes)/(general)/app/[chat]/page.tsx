import { currentUser } from "@clerk/nextjs/server";
import { getChatHistory } from "@/actions/actions";
import { redirect } from "next/navigation";
import MsgLoader from "@/components/chat-provider-components/msg-loader";
import OptimisticChat from "@/components/chat-provider-components/optimistic-chat";

const Page = async ({ params }: { params: { chat: string } }) => {
  const user = await currentUser();
  const { chat } = params;

  const fetchedData = await getChatHistory({
    chatID: chat,
    userID: user?.id as string,
  });
  if (!fetchedData.success || !user) redirect("/app");
  const { message } = fetchedData;
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
  const image = user.imageUrl;

  return (
      <div className="w-full max-w-3xl mx-auto p-4 pb-40">
        <OptimisticChat message={message} name={name} image={image} />
        <MsgLoader name={name} image={image} />
      </div>
  );
};

export default Page;
