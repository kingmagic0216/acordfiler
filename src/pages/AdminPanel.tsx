import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Users, 
  Settings, 
  FileText, 
  Plus,
  Edit,
  Trash2,
  Save,
  Upload,
  Download,
  Activity,
  Palette,
  MapPin,
  Key,
  LogOut,
  User,
  AlertCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { authService, User as AuthUser } from "@/services/authService";
import AddFieldMappingModal from "@/components/AddFieldMappingModal";
import EditFieldMappingModal from "@/components/EditFieldMappingModal";
import AddUserModal from "@/components/AddUserModal";
import EditUserModal from "@/components/EditUserModal";
import SystemSettingsModal from "@/components/SystemSettingsModal";

interface FieldMapping {
  id: string;
  acordForm: string;
  fieldName: string;
  intakeField: string;
  fieldType: string;
  required: boolean;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  
  // Modal states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isSystemSettingsModalOpen, setIsSystemSettingsModalOpen] = useState(false);
  const [isAddFieldMappingModalOpen, setIsAddFieldMappingModalOpen] = useState(false);
  const [isEditFieldMappingModalOpen, setIsEditFieldMappingModalOpen] = useState(false);
  const [selectedFieldMapping, setSelectedFieldMapping] = useState<FieldMapping | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // User management state
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "John Smith",
      email: "john@abcinsurance.com",
      role: "Broker",
      status: "Active",
      lastLogin: "2024-01-15",
      submissions: 23
    },
    {
      id: 2,
      name: "Sarah Johnson", 
      email: "sarah@techsolutions.com",
      role: "Customer",
      status: "Active",
      lastLogin: "2024-01-14",
      submissions: 1
    },
    {
      id: 3,
      name: "Mike Wilson",
      email: "mike@greenearth.com",
      role: "Customer", 
      status: "Inactive",
      lastLogin: "2024-01-10",
      submissions: 3
    },
    {
      id: 4,
      name: "Lisa Chen",
      email: "lisa@downtownrest.com",
      role: "Customer",
      status: "Active", 
      lastLogin: "2024-01-12",
      submissions: 2
    },
  ]);

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([
    {
      id: "mapping-1",
      acordForm: "ACORD 125",
      fieldName: "Business Name",
      intakeField: "businessInfo.name",
      fieldType: "Text",
      required: true
    },
    {
      id: "mapping-2",
      acordForm: "ACORD 125",
      fieldName: "Federal ID",
      intakeField: "businessInfo.federalId",
      fieldType: "Text",
      required: true
    },
    {
      id: "mapping-3",
      acordForm: "ACORD 126",
      fieldName: "Business Description",
      intakeField: "businessInfo.description",
      fieldType: "Textarea",
      required: true
    },
    {
      id: "mapping-4",
      acordForm: "ACORD 127",
      fieldName: "Vehicle Count",
      intakeField: "autoInfo.vehicleCount",
      fieldType: "Number",
      required: false
    }
  ]);

  // Initialize auth service
  useEffect(() => {
    authService.initialize();
    const unsubscribe = authService.subscribe((authState) => {
      setCurrentUser(authState.user);
      if (!authState.user || authState.user.role !== 'admin') {
        navigate('/');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleSignOut = async () => {
    await authService.signOut();
    navigate('/');
  };

  // User management handlers
  const handleAddUser = (newUser: any) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  };

  const handleUserUpdated = (updatedUser: any) => {
    setUsers(prev => prev.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      setUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  // Export logs handler
  const handleExportLogs = async () => {
    try {
      const headers = [
        'Timestamp', 'User', 'Action', 'Details', 'IP Address'
      ];
      const csvContent = [
        headers.join(','),
        ...auditLogs.map(log => [
          log.timestamp,
          `"${log.user}"`,
          `"${log.action}"`,
          `"${log.details}"`,
          log.ipAddress
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert('Failed to export logs. Please try again.');
    }
  };

  // System settings handler
  const handleSystemSettingsSaved = (settings: any) => {
    console.log('System settings saved:', settings);
    // In a real app, this would save to backend
  };

  const handleAddFieldMapping = () => {
    setIsAddFieldMappingModalOpen(true);
  };

  const handleFieldMappingSaved = (mapping: FieldMapping) => {
    setFieldMappings(prev => [...prev, mapping]);
    console.log('Field mapping added:', mapping);
  };

  const handleEditFieldMapping = (mapping: FieldMapping) => {
    setSelectedFieldMapping(mapping);
    setIsEditFieldMappingModalOpen(true);
  };

  const handleDeleteFieldMapping = (mappingId: string) => {
    if (confirm('Are you sure you want to delete this field mapping?')) {
      setFieldMappings(prev => prev.filter(mapping => mapping.id !== mappingId));
      console.log('Field mapping deleted:', mappingId);
    }
  };

  const handleFieldMappingUpdated = (updatedMapping: FieldMapping) => {
    setFieldMappings(prev => 
      prev.map(mapping => 
        mapping.id === updatedMapping.id ? updatedMapping : mapping
      )
    );
    console.log('Field mapping updated:', updatedMapping);
  };


  const auditLogs = [
    {
      id: 1,
      timestamp: "2024-01-15 10:30:00",
      user: "John Smith",
      action: "Form Generated",
      details: "Generated ACORD 125 for ABC Manufacturing",
      ipAddress: "192.168.1.100"
    },
    {
      id: 2,
      timestamp: "2024-01-15 09:15:00", 
      user: "Admin",
      action: "User Created",
      details: "Created broker account for Jane Doe",
      ipAddress: "192.168.1.50"
    },
    {
      id: 3,
      timestamp: "2024-01-14 16:45:00",
      user: "Sarah Johnson",
      action: "Submission Created",
      details: "New submission for Tech Solutions LLC",
      ipAddress: "203.0.113.25"
    },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Admin":
        return <Badge className="bg-status-rejected text-primary-foreground">Admin</Badge>;
      case "Broker":
        return <Badge className="bg-insurance-navy text-primary-foreground">Broker</Badge>;
      case "Customer":
        return <Badge className="bg-insurance-blue text-primary-foreground">Customer</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-status-approved text-primary-foreground">Active</Badge>;
      case "Inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-form">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-gray-900">ACORD Intake Platform</span>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-gray-600">Admin Panel</span>
            </div>
            <div className="flex items-center space-x-3">
              {currentUser && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{currentUser.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {currentUser.role}
                  </Badge>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleExportLogs}>
                <Download className="mr-2 h-4 w-4" />
                Export Logs
              </Button>
              <Button variant="professional" size="sm" onClick={() => setIsSystemSettingsModalOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                System Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, settings, and system configuration</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-form transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">89</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <div className="p-3 rounded-lg bg-insurance-blue/10">
                  <Users className="h-5 w-5 text-insurance-blue" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-form transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">15</p>
                  <p className="text-sm text-muted-foreground">Active Brokers</p>
                </div>
                <div className="p-3 rounded-lg bg-insurance-navy/10">
                  <Shield className="h-5 w-5 text-insurance-navy" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-form transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">6</p>
                  <p className="text-sm text-muted-foreground">ACORD Forms</p>
                </div>
                <div className="p-3 rounded-lg bg-status-approved/10">
                  <FileText className="h-5 w-5 text-status-approved" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-form transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">99.8%</p>
                  <p className="text-sm text-muted-foreground">System Uptime</p>
                </div>
                <div className="p-3 rounded-lg bg-status-approved/10">
                  <Activity className="h-5 w-5 text-status-approved" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>User Management</span>
                  <Button variant="professional" size="sm" onClick={() => setIsAddUserModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>{user.lastLogin}</TableCell>
                        <TableCell>{user.submissions}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapping" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>ACORD Field Mapping</span>
                  <Button variant="professional" size="sm" onClick={handleAddFieldMapping}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Mapping
                  </Button>
                </CardTitle>
                <CardDescription>Configure how intake fields map to ACORD form fields</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ACORD Form</TableHead>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Intake Field</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          <Badge variant="outline">{mapping.acordForm}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{mapping.fieldName}</TableCell>
                        <TableCell className="font-mono text-sm">{mapping.intakeField}</TableCell>
                        <TableCell>{mapping.fieldType}</TableCell>
                        <TableCell>
                          {mapping.required ? (
                            <Badge className="bg-status-rejected text-primary-foreground">Required</Badge>
                          ) : (
                            <Badge variant="secondary">Optional</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditFieldMapping(mapping)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteFieldMapping(mapping.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="mr-2 h-5 w-5" />
                    Brand Colors
                  </CardTitle>
                  <CardDescription>Customize your platform's appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center space-x-3 mt-1">
                      <Input id="primaryColor" defaultValue="#1e3a8a" className="w-32" />
                      <div className="w-8 h-8 rounded border bg-insurance-navy"></div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex items-center space-x-3 mt-1">
                      <Input id="accentColor" defaultValue="#3b82f6" className="w-32" />
                      <div className="w-8 h-8 rounded border bg-insurance-blue"></div>
                    </div>
                  </div>
                  <Button variant="professional" className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save Colors
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="mr-2 h-5 w-5" />
                    Logo & Assets
                  </CardTitle>
                  <CardDescription>Upload your company branding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Company Logo</Label>
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center mt-2">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Drop your logo here or click to browse
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" defaultValue="ACORD Intake Platform" />
                  </div>
                  <Button variant="professional" className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save Branding
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>View system activity and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                        <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure global platform settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Auto-save forms</Label>
                      <p className="text-sm text-muted-foreground">Automatically save form progress</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Email notifications</Label>
                      <p className="text-sm text-muted-foreground">Send email updates to users</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Audit logging</Label>
                      <p className="text-sm text-muted-foreground">Track all system activities</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="mr-2 h-5 w-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>Configure security and access controls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input id="sessionTimeout" type="number" value="30" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="passwordPolicy">Password Policy</Label>
                    <Select defaultValue="strong">
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                        <SelectItem value="strong">Strong (8+ chars, mixed case, numbers)</SelectItem>
                        <SelectItem value="strict">Strict (12+ chars, special characters)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Two-factor authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onUserAdded={handleAddUser}
      />
      
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />
      
      <SystemSettingsModal
        isOpen={isSystemSettingsModalOpen}
        onClose={() => setIsSystemSettingsModalOpen(false)}
        onSettingsSaved={handleSystemSettingsSaved}
      />
      
      {/* Add Field Mapping Modal */}
      <AddFieldMappingModal
        isOpen={isAddFieldMappingModalOpen}
        onClose={() => setIsAddFieldMappingModalOpen(false)}
        onSave={handleFieldMappingSaved}
      />
      
      {/* Edit Field Mapping Modal */}
      <EditFieldMappingModal
        isOpen={isEditFieldMappingModalOpen}
        onClose={() => {
          setIsEditFieldMappingModalOpen(false);
          setSelectedFieldMapping(null);
        }}
        mapping={selectedFieldMapping}
        onSave={handleFieldMappingUpdated}
      />
    </div>
  );
};

export default AdminPanel;