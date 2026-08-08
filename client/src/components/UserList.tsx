import { useRoomStore } from '@/store/roomStore';

export default function UserList() {
  const { onlineUsers } = useRoomStore();

  return (
    <div className="flex items-center gap-1" title="Online users">
      {onlineUsers.slice(0, 5).map((u) => (
        <div
          key={u.socketId}
          className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium border-2 border-white -ml-1 first:ml-0"
          title={u.userName}
        >
          {u.userName.charAt(0).toUpperCase()}
        </div>
      ))}
      {onlineUsers.length > 5 && (
        <span className="text-xs text-gray-400 ml-1">+{onlineUsers.length - 5}</span>
      )}
    </div>
  );
}
