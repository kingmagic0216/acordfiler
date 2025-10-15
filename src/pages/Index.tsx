import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, FileText, Users, ArrowRight, CheckCircle, Clock, AlertCircle, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import SignInModal from "@/components/SignInModal";
import ContactSalesModal from "@/components/ContactSalesModal";
import ScheduleDemoModal from "@/components/ScheduleDemoModal";
import { authService, User as AuthUser } from "@/services/authService";

const Index = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isContactSalesOpen, setIsContactSalesOpen] = useState(false);
  const [isScheduleDemoOpen, setIsScheduleDemoOpen] = useState(false);

  // Initialize auth service and listen for changes
  useEffect(() => {
    authService.initialize();
    const unsubscribe = authService.subscribe((authState) => {
      setCurrentUser(authState.user);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = (user: AuthUser) => {
    setCurrentUser(user);
    // Redirect based on user role
    switch (user.role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'broker':
        navigate('/broker');
        break;
      case 'customer':
        navigate('/customer');
        break;
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setCurrentUser(null);
  };

  const roles = [
    {
      id: "customer",
      title: "Customer Portal",
      description: "Complete your insurance application with our smart intake form",
      icon: <FileText className="h-8 w-8" />,
      features: ["Smart questionnaire", "Document upload", "Status tracking", "E-signature"],
      color: "bg-insurance-blue",
    },
    {
      id: "broker",
      title: "Broker Console",
      description: "Manage submissions and generate ACORD forms efficiently",
      icon: <Building2 className="h-8 w-8" />,
      features: ["Submission management", "ACORD generation", "COI workflow", "Client management"],
      color: "bg-insurance-navy",
    },
    {
      id: "admin",
      title: "Admin Dashboard",
      description: "Configure system settings and manage users",
      icon: <Shield className="h-8 w-8" />,
      features: ["User management", "Form mapping", "Brand settings", "Audit logs"],
      color: "bg-insurance-gray",
    },
  ];

  const stats = [
    { label: "Forms Generated", value: "2,847", icon: <FileText className="h-5 w-5" />, color: "text-status-approved" },
    { label: "Active Submissions", value: "134", icon: <Clock className="h-5 w-5" />, color: "text-insurance-gray" },
    { label: "Completed Applications", value: "1,923", icon: <CheckCircle className="h-5 w-5" />, color: "text-status-approved" },
    { label: "Users", value: "89", icon: <Users className="h-5 w-5" />, color: "text-status-review" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-form">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ACORD Intake Platform</h1>
                <p className="text-sm text-gray-700">Smart form automation for insurance professionals</p>
              </div>
            </div>
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{currentUser.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {currentUser.role}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsSignInOpen(true)}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Streamline Your Insurance Applications
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Transform complex intake processes into simple, smart questionnaires that auto-populate ACORD forms
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="secondary" size="lg" className="bg-white text-blue-900 hover:bg-gray-50 border border-gray-200" onClick={() => navigate('/customer')}>
              Start Application
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-900 bg-transparent" onClick={() => setIsScheduleDemoOpen(true)}>
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className={`inline-flex items-center justify-center h-12 w-12 rounded-lg bg-muted mb-3 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Choose Your Portal</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access the right tools for your role in the insurance application process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {roles.map((role) => (
              <Card 
                key={role.id} 
                className={`cursor-pointer transition-all duration-300 hover:shadow-elegant ${
                  selectedRole === role.id ? 'ring-2 ring-primary shadow-elegant' : ''
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader className="text-center">
                  <div className={`inline-flex items-center justify-center h-16 w-16 rounded-xl ${role.color} text-primary-foreground mx-auto mb-4`}>
                    {role.icon}
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <CardDescription className="text-base">{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {role.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-status-approved" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full mt-6" 
                    variant={selectedRole === role.id ? "professional" : "outline"}
                    asChild
                  >
                    <Link to={`/${role.id}`}>
                      Access {role.title}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Platform Features</h3>
            <p className="text-lg text-muted-foreground">
              Everything you need for efficient insurance application processing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Smart Intake Forms",
                description: "Dynamic questionnaires with conditional logic that adapt based on responses",
                icon: <FileText className="h-6 w-6" />,
              },
              {
                title: "ACORD Auto-Population",
                description: "Automatically fill standard insurance forms from intake data",
                icon: <CheckCircle className="h-6 w-6" />,
              },
              {
                title: "Document Management",
                description: "Secure upload, storage, and organization of all application documents",
                icon: <Building2 className="h-6 w-6" />,
              },
              {
                title: "E-Signature Integration",
                description: "Seamless signing workflow with popular e-signature providers",
                icon: <Shield className="h-6 w-6" />,
              },
              {
                title: "COI Generation",
                description: "Quick certificate of insurance creation with templated holders",
                icon: <FileText className="h-6 w-6" />,
              },
              {
                title: "Audit & Compliance",
                description: "Complete audit trails and compliance reporting capabilities",
                icon: <AlertCircle className="h-6 w-6" />,
              },
            ].map((feature, index) => (
              <Card key={index} className="hover:shadow-form transition-shadow">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4 text-white">Ready to Get Started?</h3>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Join insurance professionals who are already streamlining their application processes
          </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="secondary" size="lg" className="bg-white text-blue-900 hover:bg-gray-50 border border-gray-200" onClick={() => setIsContactSalesOpen(true)}>
            Contact Sales
          </Button>
          <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-900 bg-transparent" onClick={() => setIsScheduleDemoOpen(true)}>
            Schedule Demo
          </Button>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-insurance-navy">ACORD Intake Platform</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>© 2024 All rights reserved</span>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
              <a href="#" className="hover:text-primary">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignIn={handleSignIn}
      />
      <ContactSalesModal
        isOpen={isContactSalesOpen}
        onClose={() => setIsContactSalesOpen(false)}
      />
      <ScheduleDemoModal
        isOpen={isScheduleDemoOpen}
        onClose={() => setIsScheduleDemoOpen(false)}
      />
    </div>
  );
};

export default Index;