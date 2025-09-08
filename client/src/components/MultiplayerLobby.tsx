import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, ArrowLeft, Crown } from "lucide-react";
import { User, GameRoom } from "@shared/schema";
import { QuizConfig } from "@/components/QuizConfigScreen";
import { useToast } from "@/hooks/use-toast";

interface MultiplayerLobbyProps {
  user: User;
  onBack: () => void;
  onJoinRoom: (room: GameRoom) => void;
}

export default function MultiplayerLobby({ user, onBack, onJoinRoom }: MultiplayerLobbyProps) {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createRoomData, setCreateRoomData] = useState({
    name: "",
    maxPlayers: 4,
    config: { amount: 10, category: 0, difficulty: "any" } as QuizConfig
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('Connected to multiplayer lobby');
      setIsConnected(true);
      
      // Join lobby
      wsRef.current?.send(JSON.stringify({
        type: 'join_lobby',
        userId: user.id
      }));
      
      // Get initial room list
      wsRef.current?.send(JSON.stringify({
        type: 'get_rooms'
      }));
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'lobby_joined':
          console.log('Joined lobby successfully');
          break;
          
        case 'rooms_list':
          setRooms(data.rooms || []);
          break;
          
        case 'room_list_updated':
          // Refresh room list
          wsRef.current?.send(JSON.stringify({
            type: 'get_rooms'
          }));
          break;
          
        case 'room_created':
          toast({
            title: "Room Created!",
            description: `Successfully created "${data.room.name}"`,
          });
          setShowCreateDialog(false);
          onJoinRoom(data.room);
          break;
          
        case 'room_joined':
          toast({
            title: "Joined Room!",
            description: `Joined "${data.room.name}"`,
          });
          onJoinRoom(data.room);
          break;
          
        case 'error':
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
          break;
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('Disconnected from lobby');
      setIsConnected(false);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to multiplayer lobby",
        variant: "destructive",
      });
    };
    
    return () => {
      wsRef.current?.close();
    };
  }, [user.id, toast, onJoinRoom]);

  const handleCreateRoom = () => {
    if (!createRoomData.name.trim()) {
      toast({
        title: "Invalid Room Name",
        description: "Please enter a room name",
        variant: "destructive",
      });
      return;
    }
    
    wsRef.current?.send(JSON.stringify({
      type: 'create_room',
      userId: user.id,
      roomName: createRoomData.name.trim(),
      maxPlayers: createRoomData.maxPlayers,
      config: createRoomData.config
    }));
  };

  const handleJoinRoom = (room: GameRoom) => {
    if (room.currentPlayers >= room.maxPlayers) {
      toast({
        title: "Room Full",
        description: "This room is already full",
        variant: "destructive",
      });
      return;
    }
    
    wsRef.current?.send(JSON.stringify({
      type: 'join_room',
      userId: user.id,
      roomId: room.id
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-blue-100 text-blue-800';
      case 'playing': return 'bg-orange-100 text-orange-800';
      case 'finished': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Background Blobs */}
      <div className="blob-top"></div>
      <div className="blob-bottom"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              data-testid="button-back-to-menu"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="font-bold text-4xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent" 
                  style={{ fontFamily: 'Karla, sans-serif' }}>
                Multiplayer Lobby
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-slate-600 text-sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-2xl">{user.avatar}</span>
            <div className="text-right">
              <p className="font-semibold text-slate-700">{user.displayName}</p>
              <p className="text-sm text-slate-500">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Create Room Button */}
        <div className="mb-6">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                disabled={!isConnected}
                data-testid="button-create-room"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="room-name">Room Name</Label>
                  <Input
                    id="room-name"
                    value={createRoomData.name}
                    onChange={(e) => setCreateRoomData({...createRoomData, name: e.target.value})}
                    placeholder="Enter room name"
                    data-testid="input-room-name"
                  />
                </div>
                <div>
                  <Label htmlFor="max-players">Max Players</Label>
                  <select 
                    id="max-players"
                    value={createRoomData.maxPlayers}
                    onChange={(e) => setCreateRoomData({...createRoomData, maxPlayers: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded-md"
                    data-testid="select-max-players"
                  >
                    <option value={2}>2 Players</option>
                    <option value={4}>4 Players</option>
                    <option value={6}>6 Players</option>
                    <option value={8}>8 Players</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="questions">Number of Questions</Label>
                  <select 
                    id="questions"
                    value={createRoomData.config.amount}
                    onChange={(e) => setCreateRoomData({
                      ...createRoomData, 
                      config: { ...createRoomData.config, amount: parseInt(e.target.value) }
                    })}
                    className="w-full p-2 border rounded-md"
                    data-testid="select-questions"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select 
                    id="difficulty"
                    value={createRoomData.config.difficulty}
                    onChange={(e) => setCreateRoomData({
                      ...createRoomData, 
                      config: { ...createRoomData.config, difficulty: e.target.value as any }
                    })}
                    className="w-full p-2 border rounded-md"
                    data-testid="select-difficulty"
                  >
                    <option value="any">Any Difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <Button 
                  onClick={handleCreateRoom} 
                  className="w-full"
                  data-testid="button-confirm-create"
                >
                  Create Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Room List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-slate-400 mb-4">
                <Users className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No Rooms Available</h3>
              <p className="text-slate-500">Be the first to create a room!</p>
            </div>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} className="bg-white/95 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {room.hostId === user.id && <Crown className="w-4 h-4 text-yellow-500" />}
                      {room.name}
                    </CardTitle>
                    <Badge className={getStatusColor(room.status)} variant="secondary">
                      {room.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Players:</span>
                    <span className="font-semibold">{room.currentPlayers}/{room.maxPlayers}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Questions:</span>
                    <span className="font-semibold">{(room.config as QuizConfig)?.amount || 10}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Difficulty:</span>
                    <Badge className={getDifficultyColor((room.config as QuizConfig)?.difficulty || 'any')} variant="secondary">
                      {(room.config as QuizConfig)?.difficulty || 'Any'}
                    </Badge>
                  </div>
                  
                  <Button 
                    onClick={() => handleJoinRoom(room)}
                    disabled={room.currentPlayers >= room.maxPlayers || room.status !== 'waiting' || !isConnected}
                    className="w-full mt-4"
                    data-testid={`button-join-room-${room.id}`}
                  >
                    {room.currentPlayers >= room.maxPlayers ? 'Room Full' : 
                     room.status !== 'waiting' ? 'Game In Progress' : 'Join Room'}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}