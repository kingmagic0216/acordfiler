import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Upload, Save, Shield, CheckCircle, Loader2, LogOut, User as UserIcon, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formService, BusinessInfo, ContactInfo, CoverageInfo } from "@/services/formService";
import { authService, User as AuthUser } from "@/services/authService";
import { coverageQuestionsService, CoverageQuestion, CoverageResponse, ClientType } from "@/services/coverageQuestionsService";

const CustomerIntake = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; submissionId?: string; error?: string } | null>(null);
  const [formData, setFormData] = useState({
    clientType: "" as ClientType | "",
    businessName: "",
    federalId: "",
    businessType: "",
    yearsInBusiness: "",
    description: "",
    website: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    coverageTypes: [] as string[],
  });
  const [coverageQuestions, setCoverageQuestions] = useState<CoverageQuestion[]>([]);
  const [coverageResponses, setCoverageResponses] = useState<Record<string, any>>({});
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    { number: 1, title: "Client Type", description: "Are you applying for personal or business insurance?" },
    { number: 2, title: "Business Information", description: "Tell us about your business" },
    { number: 3, title: "Contact Details", description: "How can we reach you?" },
    { number: 4, title: "Coverage Needs", description: "What coverage do you need?" },
    { number: 5, title: "Coverage Questions", description: "Answer coverage-specific questions" },
    { number: 6, title: "Review & Submit", description: "Confirm your information" },
  ];

  const getCoverageOptions = () => {
    const clientType = formData.clientType as ClientType;
    const availableCoverages = coverageQuestionsService.getCoverageTypes(clientType);
    
    return availableCoverages.map(coverage => ({
      id: coverage.id,
      label: coverage.name,
      required: coverage.id === 'general-liability' && clientType === 'business'
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCoverageChange = (coverageId: string, checked: boolean) => {
    const newCoverageTypes = checked 
      ? [...formData.coverageTypes, coverageId]
      : formData.coverageTypes.filter(id => id !== coverageId);
    
    setFormData(prev => ({
      ...prev,
      coverageTypes: newCoverageTypes
    }));

    // Load coverage-specific questions when coverage types change
    const questions = coverageQuestionsService.getQuestionsForCoverages(newCoverageTypes, formData.clientType as ClientType);
    setCoverageQuestions(questions);
    
    // Clear responses for removed coverage types
    if (!checked) {
      const coverageType = coverageQuestionsService.getCoverageTypeById(coverageId);
      if (coverageType) {
        const questionIds = coverageType.questions.map(q => q.id);
        setCoverageResponses(prev => {
          const newResponses = { ...prev };
          questionIds.forEach(id => delete newResponses[id]);
          return newResponses;
        });
      }
    }
  };

  const handleCoverageQuestionChange = (questionId: string, value: any) => {
    setCoverageResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      // Validate required fields
      if (!formData.businessName || !formData.federalId || !formData.businessType || 
          !formData.yearsInBusiness || !formData.description || !formData.contactName || 
          !formData.email || !formData.phone || !formData.address || 
          !formData.city || !formData.state || !formData.zip) {
        throw new Error("Please fill in all required fields");
      }

      // Ensure General Liability is selected (required)
      if (!formData.coverageTypes.includes("general-liability")) {
        throw new Error("General Liability coverage is required");
      }

      // Prepare form data for submission
      const businessInfo: BusinessInfo = {
        name: formData.businessName,
        federalId: formData.federalId,
        businessType: formData.businessType,
        yearsInBusiness: parseInt(formData.yearsInBusiness),
        description: formData.description,
        website: formData.website || undefined,
      };

      const contactInfo: ContactInfo = {
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zip,
      };

      const coverageInfo: CoverageInfo = {
        coverageTypes: formData.coverageTypes.map(id => {
          const option = coverageOptions.find(opt => opt.id === id);
          return option ? option.label : id;
        }),
        coverageResponses: coverageResponses,
      };

      // Submit the form
      const submission = await formService.submitForm(businessInfo, contactInfo, coverageInfo);
      
      setSubmissionResult({
        success: true,
        submissionId: submission.id,
      });

      // Redirect to success page after a delay
      setTimeout(() => {
        navigate(`/broker?submission=${submission.id}`);
      }, 3000);

    } catch (error) {
      setSubmissionResult({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred while submitting the form",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What type of insurance are you looking for?</h3>
            <p className="text-gray-600 mb-6">
              This helps us provide the right coverage options and questions for your needs.
            </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <Card 
                  className={`p-6 cursor-pointer transition-all ${
                    formData.clientType === 'personal' 
                      ? 'ring-2 ring-insurance-blue bg-insurance-blue/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, clientType: 'personal' }))}
                >
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Personal Insurance</h4>
                    <p className="text-sm text-muted-foreground">
                      Auto, Home, Personal Liability, and other personal coverage
                    </p>
                  </div>
                </Card>

                <Card 
                  className={`p-6 cursor-pointer transition-all ${
                    formData.clientType === 'business' 
                      ? 'ring-2 ring-insurance-blue bg-insurance-blue/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, clientType: 'business' }))}
                >
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <Building2 className="h-6 w-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Business Insurance</h4>
                    <p className="text-sm text-muted-foreground">
                      General Liability, Commercial Auto, Workers Comp, and more
                    </p>
                  </div>
                </Card>

                <Card 
                  className={`p-6 cursor-pointer transition-all ${
                    formData.clientType === 'both' 
                      ? 'ring-2 ring-insurance-blue bg-insurance-blue/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, clientType: 'both' }))}
                >
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-3">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Both Personal & Business</h4>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive coverage for both personal and business needs
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input 
                  id="businessName" 
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Enter your business name" 
                />
              </div>
              <div>
                <Label htmlFor="federalId">Federal ID/EIN *</Label>
                <Input 
                  id="federalId" 
                  value={formData.federalId}
                  onChange={(e) => setFormData(prev => ({ ...prev, federalId: e.target.value }))}
                  placeholder="XX-XXXXXXX" 
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessType">Business Type *</Label>
                <Select value={formData.businessType} onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="yearsInBusiness">Years in Business *</Label>
                <Input 
                  id="yearsInBusiness" 
                  type="number"
                  value={formData.yearsInBusiness}
                  onChange={(e) => setFormData(prev => ({ ...prev, yearsInBusiness: e.target.value }))}
                  placeholder="0" 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Business Description *</Label>
              <Textarea 
                id="description" 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your business operations, products, and services"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input 
                id="website" 
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://www.example.com" 
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input 
                  id="contactName" 
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="First Last" 
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@business.com" 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input 
                id="phone" 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567" 
              />
            </div>

            <div>
              <Label htmlFor="address">Business Address *</Label>
              <Input 
                id="address" 
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main Street" 
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input 
                  id="city" 
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City" 
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Select value={formData.state} onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ca">California</SelectItem>
                    <SelectItem value="ny">New York</SelectItem>
                    <SelectItem value="tx">Texas</SelectItem>
                    <SelectItem value="fl">Florida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code *</Label>
                <Input 
                  id="zip" 
                  value={formData.zip}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                  placeholder="12345" 
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select the coverage types you need:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {getCoverageOptions().map((option) => (
                  <Card key={option.id} className="p-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={option.id}
                        checked={formData.coverageTypes.includes(option.id)}
                        onCheckedChange={(checked) => handleCoverageChange(option.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={option.id} className="text-sm font-medium cursor-pointer">
                          {option.label}
                          {option.required && <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {coverageQuestionsService.getCoverageTypeById(option.id)?.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-4 bg-muted/30">
              <div className="flex items-start space-x-3">
                <Upload className="h-5 w-5 text-insurance-blue mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-2">Document Upload (Optional)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload any relevant documents such as current policies, loss runs, or financial statements.
                  </p>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Files
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Coverage-Specific Questions</h3>
              <p className="text-muted-foreground mb-6">
                Please answer these questions to help us provide accurate quotes for your selected coverage types.
              </p>
              
              {coverageQuestions.length === 0 ? (
                <Card className="p-6 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-semibold mb-2">No Additional Questions</h4>
                  <p className="text-muted-foreground">
                    The coverage types you selected don't require additional information at this time.
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {coverageQuestions.map((question) => (
                    <Card key={question.id} className="p-4">
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={question.id} className="text-sm font-medium">
                            {question.question}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {question.description && (
                            <p className="text-xs text-muted-foreground mt-1">{question.description}</p>
                          )}
                        </div>
                        
                        {question.type === 'text' && (
                          <Input
                            id={question.id}
                            value={coverageResponses[question.id] || ''}
                            onChange={(e) => handleCoverageQuestionChange(question.id, e.target.value)}
                            placeholder={question.placeholder}
                            required={question.required}
                          />
                        )}
                        
                        {question.type === 'textarea' && (
                          <Textarea
                            id={question.id}
                            value={coverageResponses[question.id] || ''}
                            onChange={(e) => handleCoverageQuestionChange(question.id, e.target.value)}
                            placeholder={question.placeholder}
                            rows={3}
                            required={question.required}
                          />
                        )}
                        
                        {question.type === 'number' && (
                          <Input
                            id={question.id}
                            type="number"
                            value={coverageResponses[question.id] || ''}
                            onChange={(e) => handleCoverageQuestionChange(question.id, parseInt(e.target.value) || '')}
                            min={question.validation?.min}
                            max={question.validation?.max}
                            required={question.required}
                          />
                        )}
                        
                        {question.type === 'select' && question.options && (
                          <Select
                            value={coverageResponses[question.id] || ''}
                            onValueChange={(value) => handleCoverageQuestionChange(question.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {question.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {question.type === 'checkbox' && question.options && (
                          <div className="space-y-2">
                            {question.options.map((option) => (
                              <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${question.id}-${option}`}
                                  checked={(coverageResponses[question.id] || []).includes(option)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = coverageResponses[question.id] || [];
                                    const newValues = checked
                                      ? [...currentValues, option]
                                      : currentValues.filter((v: string) => v !== option);
                                    handleCoverageQuestionChange(question.id, newValues);
                                  }}
                                />
                                <Label htmlFor={`${question.id}-${option}`} className="text-sm">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-status-approved mx-auto mb-3" />
              <h3 className="text-xl font-semibold mb-2">Review Your Information</h3>
              <p className="text-muted-foreground">Please review your information before submitting your application.</p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Business Name:</strong> {formData.businessName || "Not provided"}</div>
                  <div><strong>Federal ID:</strong> {formData.federalId || "Not provided"}</div>
                  <div><strong>Business Type:</strong> {formData.businessType || "Not provided"}</div>
                  <div><strong>Years in Business:</strong> {formData.yearsInBusiness || "Not provided"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Contact Name:</strong> {formData.contactName || "Not provided"}</div>
                  <div><strong>Email:</strong> {formData.email || "Not provided"}</div>
                  <div><strong>Phone:</strong> {formData.phone || "Not provided"}</div>
                  <div><strong>Address:</strong> {formData.address || "Not provided"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coverage Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {formData.coverageTypes.length > 0 ? (
                      formData.coverageTypes.map((typeId) => {
                        const option = coverageOptions.find(opt => opt.id === typeId);
                        return option ? (
                          <Badge key={typeId} variant="secondary">{option.label}</Badge>
                        ) : null;
                      })
                    ) : (
                      <span className="text-muted-foreground">No coverage types selected</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {coverageQuestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Coverage-Specific Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {coverageQuestions.map((question) => {
                      const response = coverageResponses[question.id];
                      if (response === undefined || response === '') return null;
                      
                      return (
                        <div key={question.id} className="border-l-2 border-insurance-blue pl-3">
                          <div className="text-sm font-medium text-gray-700">{question.question}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {Array.isArray(response) ? response.join(', ') : String(response)}
                          </div>
                        </div>
                      );
                    })}
                    {coverageQuestions.filter(q => coverageResponses[q.id] !== undefined && coverageResponses[q.id] !== '').length === 0 && (
                      <span className="text-muted-foreground">No additional information provided</span>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      default:
        return null;
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
              <span className="text-sm text-gray-600">Customer Portal</span>
            </div>
            <Button variant="outline" size="sm">
              <Save className="mr-2 h-4 w-4" />
              Save & Exit
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-foreground">Insurance Application</h1>
              <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
            </div>
            
            <Progress value={progress} className="mb-6" />
            
            <div className="grid grid-cols-4 gap-4">
              {steps.map((step) => (
                <div key={step.number} className={`text-center p-3 rounded-lg ${
                  step.number === currentStep ? 'bg-primary/10 border border-primary' :
                  step.number < currentStep ? 'bg-status-approved/10 border border-status-approved' :
                  'bg-muted border border-muted'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-semibold ${
                    step.number === currentStep ? 'bg-primary text-primary-foreground' :
                    step.number < currentStep ? 'bg-status-approved text-primary-foreground' :
                    'bg-muted-foreground text-primary-foreground'
                  }`}>
                    {step.number < currentStep ? <CheckCircle className="h-4 w-4" /> : step.number}
                  </div>
                  <div className="text-xs font-medium">{step.title}</div>
                  <div className="text-xs text-gray-600 hidden md:block">{step.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Success/Error Messages */}
          {submissionResult && (
            <Card className={`mb-6 ${submissionResult.success ? 'border-status-approved' : 'border-status-rejected'}`}>
              <CardContent className="pt-6">
                {submissionResult.success ? (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-status-approved mx-auto mb-3" />
                    <h3 className="text-xl font-semibold text-status-approved mb-2">Application Submitted Successfully!</h3>
                    <p className="text-muted-foreground mb-2">
                      Your application has been submitted with ID: <strong>{submissionResult.submissionId}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You will be redirected to the broker console in a few seconds...
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="h-12 w-12 bg-status-rejected/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-status-rejected text-xl">!</span>
                    </div>
                    <h3 className="text-xl font-semibold text-status-rejected mb-2">Submission Failed</h3>
                    <p className="text-muted-foreground">{submissionResult.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Form Content */}
          {!submissionResult?.success && (
            <Card className="shadow-form">
              <CardHeader>
                <CardTitle>{steps[currentStep - 1].title}</CardTitle>
                <CardDescription>{steps[currentStep - 1].description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button 
              variant="outline" 
              onClick={handlePrev}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            {currentStep === totalSteps ? (
              <Button 
                variant="professional" 
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerIntake;