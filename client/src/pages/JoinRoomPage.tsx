import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Room } from '@/types';

export default function JoinRoomPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/rooms/join/${inviteToken}`).then((r) => r.data as Room),
    onSuccess: (room) => {
      toast.success(`Joined "${room.name}"`);
      navigate(`/room/${room._id}`);
    },
    onError: () => {
      toast.error('Invalid or expired invite link');
      navigate('/dashboard');
    },
  });

  useEffect(() => { joinMutation.mutate(); }, []); // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 animate-pulse">Joining room…</p>
    </div>
  );
}
