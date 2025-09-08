import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthScreenProps {
  onAuth: (user: User) => void;
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [loginData, setLoginData] = useState({
    username: "",
    password: ""
  });
  
  const [registerData, setRegisterData] = useState({
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
    avatar: "👤"
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/auth/login', loginData);
      const data = await response.json();
      
      if (data.user) {
        toast({
          title: "Welcome back!",
          description: `Logged in as ${data.user.displayName}. Your session will be saved.`,
        });
        onAuth(data.user);
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Registration failed",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password.length < 3) {
      toast({
        title: "Registration failed",
        description: "Password must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/auth/register', {
        username: registerData.username,
        displayName: registerData.displayName,
        password: registerData.password,
        avatar: registerData.avatar
      });
      const data = await response.json();
      
      if (data.user) {
        toast({
          title: "Account created!",
          description: `Welcome to Quizzical, ${data.user.displayName}! Your session will be saved.`,
        });
        onAuth(data.user);
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const avatarOptions = ["👤", "😀", "😎", "🤓", "👨‍💻", "👩‍💻", "🧠", "🎯", "🏆", "⚡", "🔥", "✨"];

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Background Blobs */}
      <div className="blob-top"></div>
      <div className="blob-bottom"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-bold text-4xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2" 
              style={{ fontFamily: 'Karla, sans-serif' }}>
            Quizzical
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Join the competitive quiz experience
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            🔒 Your session and preferences are automatically saved
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="login" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300">Login</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-slate-700 dark:text-slate-300">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-slate-200/60 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  Enter your credentials to continue
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      type="text"
                      value={loginData.username}
                      onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                      required
                      disabled={isLoading}
                      data-testid="input-login-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      required
                      disabled={isLoading}
                      data-testid="input-login-password"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-slate-200/60 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Join the quiz competition
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      type="text"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                      required
                      disabled={isLoading}
                      data-testid="input-register-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-displayName">Display Name</Label>
                    <Input
                      id="register-displayName"
                      type="text"
                      value={registerData.displayName}
                      onChange={(e) => setRegisterData({...registerData, displayName: e.target.value})}
                      required
                      disabled={isLoading}
                      data-testid="input-register-displayname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avatar</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {avatarOptions.map((avatar) => (
                        <button
                          key={avatar}
                          type="button"
                          className={`text-2xl p-2 rounded border-2 transition-colors ${
                            registerData.avatar === avatar 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                          onClick={() => setRegisterData({...registerData, avatar})}
                          disabled={isLoading}
                          data-testid={`avatar-${avatar}`}
                        >
                          {avatar}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      required
                      disabled={isLoading}
                      data-testid="input-register-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirmPassword">Confirm Password</Label>
                    <Input
                      id="register-confirmPassword"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      required
                      disabled={isLoading}
                      data-testid="input-register-confirm-password"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}