const contactId = (contact) => contact?.userId || contact?.id || contact?.profile?.id;

const fullName = (user) =>
  user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

export const mergeChatContacts = (friends = [], conversations = []) => {
  const contacts = new Map();

  friends.forEach((friend) => {
    const id = contactId(friend);
    if (id) contacts.set(id, { ...friend, id, userId: id });
  });

  conversations.forEach((conversation) => {
    const user = conversation.otherUser;
    const id = user?.id;
    if (!id) return;
    const existing = contacts.get(id) || {};
    contacts.set(id, {
      ...existing,
      id,
      userId: id,
      profile: { ...(existing.profile || {}), ...user, fullName: fullName(user) },
      fullName: fullName(user),
      avatarUrl: user.avatarUrl || existing.avatarUrl,
      conversationId: conversation.conversationId,
      lastMessageContent: conversation.lastMessageContent,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.unreadCount || 0,
    });
  });

  return Array.from(contacts.values());
};

export const conversationMapFrom = (conversations = []) => Object.fromEntries(
  conversations
    .filter((conversation) => conversation.otherUser?.id && conversation.conversationId)
    .map((conversation) => [conversation.otherUser.id, conversation.conversationId]),
);
