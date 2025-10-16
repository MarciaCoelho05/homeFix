export default function ChatMessage({ message, isOwn = false }) {
  const content = typeof message?.content === 'string' ? message.content : '';
  const createdAtRaw = message?.createdAt;
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;
  const hasValidTime = createdAt instanceof Date && !Number.isNaN(createdAt.getTime());

  const isProbablyImageUrl = content.startsWith('http');

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs px-4 py-2 rounded-lg ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
        {isProbablyImageUrl ? (
          <img
            src={content}
            alt="Imagem"
            className="rounded max-w-full"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <p>{content}</p>
        )}
        {hasValidTime && (
          <p className="text-xs mt-1 opacity-70 text-right">
            {createdAt.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}