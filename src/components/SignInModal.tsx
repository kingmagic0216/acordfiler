import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { authService, User as AuthUser } from "@/services/authService";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (user: AuthUser) => void;
}

const SignInModal = ({ isOpen, onClose, onSignIn }: SignInModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await authService.signIn(email, password);
      
      if (result.success && result.user) {
        onSignIn(result.user);
        onClose();
        setEmail("");
        setPassword("");
      } else {
        setError(result.error || "Sign in failed");
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSignIn = async (role: 'admin' | 'broker' | 'customer') => {
    setIsLoading(true);
    setError("");

    const demoCredentials = {
      admin: { email: 'admin@acord.com', password: 'password' },
      broker: { email: 'broker@acord.com', password: 'password' },
      customer: { email: 'customer@acord.com', password: 'password' }
    };

    try {
      const result = await authService.signIn(
        demoCredentials[role].email,
        demoCredentials[role].password
      );
      
      if (result.success && result.user) {
        onSignIn(result.user);
        onClose();
      } else {
        setError(result.error || "Demo sign in failed");
      }
    } catch (error) {
      setError("Demo sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Access your ACORD Intake Platform account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Demo Accounts
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDemoSignIn('admin')}
                disabled={isLoading}
              >
                Demo as Admin
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDemoSignIn('broker')}
                disabled={isLoading}
              >
                Demo as Broker
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDemoSignIn('customer')}
                disabled={isLoading}
              >
                Demo as Customer
              </Button>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Demo credentials: Use any email with password "password"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInModal;
