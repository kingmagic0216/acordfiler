import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Send, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Calendar,
  Loader2,
  LogOut,
  User
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { formService, FormSubmission } from "@/services/formService";
import { pdfService } from "@/services/pdfService";
import { authService, User as AuthUser } from "@/services/authService";
import ViewSubmissionModal from "@/components/ViewSubmissionModal";
import EditSubmissionModal from "@/components/EditSubmissionModal";

const BrokerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);
  const [isGeneratingCOI, setIsGeneratingCOI] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  // Initialize auth service
  useEffect(() => {
    authService.initialize();
    const unsubscribe = authService.subscribe((authState) => {
      setCurrentUser(authState.user);
      if (!authState.user || authState.user.role !== 'broker') {
        navigate('/');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleSignOut = async () => {
    await authService.signOut();
    navigate('/');
  };

  const handleViewSubmission = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setViewModalOpen(true);
  };

  const handleEditSubmission = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setEditModalOpen(true);
  };

  const handleSaveSubmission = async (updatedSubmission: FormSubmission) => {
    // Update the submission in the list
    setSubmissions(prev => 
      prev.map(sub => sub.id === updatedSubmission.id ? updatedSubmission : sub)
    );
    
    // In a real app, you'd also update the backend
    console.log('Updated submission:', updatedSubmission);
  };

  const handleCloseModals = () => {
    setViewModalOpen(false);
    setEditModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleExport = async () => {
    try {
      // Create CSV content
      const headers = [
        'Submission ID',
        'Business Name',
        'Contact Name',
        'Email',
        'Phone',
        'Coverage Types',
        'Status',
        'Priority',
        'Submitted Date'
      ];

      const csvContent = [
        headers.join(','),
        ...submissions.map(submission => [
          submission.id,
          `"${submission.businessInfo.name}"`,
          `"${submission.contactInfo.contactName}"`,
          submission.contactInfo.email,
          submission.contactInfo.phone,
          `"${submission.coverageInfo.coverageTypes.join('; ')}"`,
          submission.status,
          submission.priority,
          submission.submittedAt.toLocaleDateString()
        ].join(','))
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `submissions_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export submissions:', error);
      alert('Failed to export submissions. Please try again.');
    }
  };

  // Load submissions on component mount
  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        const data = await formService.getSubmissions();
        setSubmissions(data);
      } catch (error) {
        console.error('Failed to load submissions:', error);
      }
    };
    loadSubmissions();
  }, []);

  // Handle URL parameters for highlighting new submissions
  useEffect(() => {
    const submissionId = searchParams.get('submission');
    if (submissionId) {
      // Scroll to the submission or show a notification
      console.log('New submission received:', submissionId);
    }
  }, [searchParams]);

  const stats = [
    { 
      label: "New Submissions", 
      value: submissions.filter(s => s.status === 'new').length.toString(), 
      icon: <FileText className="h-5 w-5" />, 
      color: "text-status-review",
      bg: "bg-status-review/10"
    },
    { 
      label: "In Review", 
      value: submissions.filter(s => s.status === 'review').length.toString(), 
      icon: <Clock className="h-5 w-5" />, 
      color: "text-insurance-gray",
      bg: "bg-insurance-gray/10"
    },
    { 
      label: "Completed", 
      value: submissions.filter(s => s.status === 'completed').length.toString(), 
      icon: <CheckCircle className="h-5 w-5" />, 
      color: "text-status-approved",
      bg: "bg-status-approved/10"
    },
    { 
      label: "Active Clients", 
      value: submissions.length.toString(), 
      icon: <Users className="h-5 w-5" />, 
      color: "text-insurance-blue",
      bg: "bg-insurance-blue/10"
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-status-review text-primary-foreground">New</Badge>;
      case "review":
        return <Badge className="bg-insurance-gray text-primary-foreground">In Review</Badge>;
      case "signature":
        return <Badge className="bg-insurance-blue text-primary-foreground">Awaiting Signature</Badge>;
      case "completed":
        return <Badge className="bg-status-approved text-primary-foreground">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge className="bg-insurance-gray text-primary-foreground">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  // Generate ACORD form PDF
  const handleGenerateACORD = async (submissionId: string, formType: string) => {
    setIsGeneratingPDF(submissionId);
    try {
      const submission = submissions.find(sub => sub.id === submissionId);
      if (!submission) {
        throw new Error('Submission not found');
      }

      const pdfBlob = await pdfService.generateACORDPDF(submission, formType);
      const filename = `${formType.replace(' ', '_')}_${submissionId}.pdf`;
      await pdfService.downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error('Failed to generate ACORD PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  // Generate COI
  const handleGenerateCOI = async (submissionId: string) => {
    setIsGeneratingCOI(submissionId);
    try {
      const submission = submissions.find(sub => sub.id === submissionId);
      if (!submission) {
        throw new Error('Submission not found');
      }

      const coiBlob = await pdfService.generateCOI(submission);
      const filename = `COI_${submissionId}.pdf`;
      await pdfService.downloadPDF(coiBlob, filename);
    } catch (error) {
      console.error('Failed to generate COI:', error);
      alert('Failed to generate COI. Please try again.');
    } finally {
      setIsGeneratingCOI(null);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesFilter = selectedFilter === "all" || submission.status === selectedFilter;
    const matchesSearch = submission.businessInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.contactInfo.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.contactInfo.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
              <span className="text-sm text-gray-600">Broker Console</span>
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
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="professional" size="sm" onClick={() => navigate('/customer')}>
                <Plus className="mr-2 h-4 w-4" />
                New Submission
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Broker Dashboard</h1>
          <p className="text-muted-foreground">Manage submissions and generate ACORD forms</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-form transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <div className={stat.color}>{stat.icon}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="submissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="coi">COI Management</TabsTrigger>
            <TabsTrigger value="forms">ACORD Forms</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Submissions</span>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search submissions..." 
                        className="pl-10 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                      <SelectTrigger className="w-40">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="review">In Review</SelectItem>
                        <SelectItem value="signature">Awaiting Signature</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Coverage Types</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{submission.businessInfo.name}</div>
                            <div className="text-sm text-muted-foreground">{submission.contactInfo.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{submission.contactInfo.contactName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {submission.coverageInfo.coverageTypes.map((type, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>{getPriorityBadge(submission.priority)}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-1 h-3 w-3" />
                            {submission.submittedAt.toLocaleDateString()}
                          </div>
                        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleViewSubmission(submission)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleEditSubmission(submission)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGenerateCOI(submission.id)}
              disabled={isGeneratingCOI === submission.id}
            >
              {isGeneratingCOI === submission.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
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

          <TabsContent value="coi">
            <Card>
              <CardHeader>
                <CardTitle>Certificate of Insurance Management</CardTitle>
                <CardDescription>Generate and manage COI documents for your clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">COI Management</h3>
                  <p className="text-muted-foreground mb-4">Create certificates of insurance for your clients</p>
                  <Button variant="professional">
                    <Plus className="mr-2 h-4 w-4" />
                    Generate New COI
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms">
            <Card>
              <CardHeader>
                <CardTitle>ACORD Forms Library</CardTitle>
                <CardDescription>Access and generate standard ACORD insurance forms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: "ACORD 25", description: "Certificate of Insurance", color: "bg-status-approved/10" },
                    { name: "ACORD 125", description: "Commercial Insurance Application", color: "bg-status-review/10" },
                    { name: "ACORD 126", description: "General Liability Application", color: "bg-insurance-gray/10" },
                    { name: "ACORD 127", description: "Business Auto Application", color: "bg-insurance-blue/10" },
                    { name: "ACORD 130", description: "Workers Compensation Application", color: "bg-insurance-gray/10" },
                    { name: "ACORD 140", description: "Property Application", color: "bg-status-approved/10" },
                  ].map((form, index) => (
                    <Card key={index} className={`hover:shadow-form transition-shadow ${form.color}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold mb-1">{form.name}</h4>
                            <p className="text-sm text-muted-foreground">{form.description}</p>
                          </div>
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-4"
                          onClick={() => {
                            if (submissions.length === 0) {
                              alert('No submissions available. Please submit a customer application first.');
                              return;
                            }
                            // Use the first submission for demo purposes
                            const firstSubmission = submissions[0];
                            handleGenerateACORD(firstSubmission.id, form.name);
                          }}
                          disabled={isGeneratingPDF !== null}
                        >
                          {isGeneratingPDF ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'Generate Form'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Client Management</CardTitle>
                <CardDescription>Manage your client relationships and communication</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Client Directory</h3>
                  <p className="text-muted-foreground mb-4">View and manage all your client relationships</p>
                  <Button variant="professional">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ViewSubmissionModal
        isOpen={viewModalOpen}
        onClose={handleCloseModals}
        submission={selectedSubmission}
        onEdit={handleEditSubmission}
        onGenerateCOI={handleGenerateCOI}
      />
      <EditSubmissionModal
        isOpen={editModalOpen}
        onClose={handleCloseModals}
        submission={selectedSubmission}
        onSave={handleSaveSubmission}
      />
    </div>
  );
};

export default BrokerDashboard;