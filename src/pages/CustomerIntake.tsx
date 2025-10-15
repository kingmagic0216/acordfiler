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
import { acordFormGenerator, CustomerData, ACORDForm } from "@/services/acordFormGenerator";
import { pdfGenerator } from "@/services/pdfGenerator";

const CustomerIntake = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; submissionId?: string; error?: string } | null>(null);
  const [generatedACORDForms, setGeneratedACORDForms] = useState<ACORDForm[]>([]);
  const [isGeneratingForms, setIsGeneratingForms] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Location & Coverage Type
    zipCode: "",
    insuranceType: "" as "personal" | "business" | "both" | "",
    // Step 2: Client Type
    clientType: "" as ClientType | "",
    // Business fields
    businessName: "",
    federalId: "",
    businessType: "",
    yearsInBusiness: "",
    description: "",
    website: "",
    // Contact fields
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    coverageTypes: [] as string[],
    // Personal fields
    dateOfBirth: "",
    ssn: "",
    occupation: "",
    employer: "",
  });
  const [coverageQuestions, setCoverageQuestions] = useState<CoverageQuestion[]>([]);
  const [coverageResponses, setCoverageResponses] = useState<Record<string, any>>({});
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const totalSteps = 7;
  const progress = (currentStep / totalSteps) * 100;

  const getStepTitle = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return "Location & Coverage Type";
      case 2:
        return "Client Type";
      case 3:
        return "Coverage Needs";
      case 4:
        return "Coverage Questions";
      case 5:
        if (formData.clientType === 'personal') return "Personal Information";
        if (formData.clientType === 'business') return "Business Information";
        return "Personal & Business Information";
      case 6:
        return "Contact Details";
      case 7:
        return "Review & Submit";
      default:
        return "Step";
    }
  };

  const getStepDescription = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return "Let's start with your location and what type of insurance you need";
      case 2:
        return "Are you applying for personal or business insurance?";
      case 3:
        return "What coverage do you need?";
      case 4:
        return "Answer coverage-specific questions";
      case 5:
        if (formData.clientType === 'personal') return "Tell us about yourself";
        if (formData.clientType === 'business') return "Tell us about your business";
        return "Tell us about yourself and your business";
      case 6:
        return "How can we reach you?";
      case 7:
        return "Confirm your information";
      default:
        return "";
    }
  };

  const steps = [
    { number: 1, title: getStepTitle(1), description: getStepDescription(1) },
    { number: 2, title: getStepTitle(2), description: getStepDescription(2) },
    { number: 3, title: getStepTitle(3), description: getStepDescription(3) },
    { number: 4, title: getStepTitle(4), description: getStepDescription(4) },
    { number: 5, title: getStepTitle(5), description: getStepDescription(5) },
    { number: 6, title: getStepTitle(6), description: getStepDescription(6) },
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

  const handleDownloadAllForms = async () => {
    if (generatedACORDForms.length === 0) return;
    
    try {
      const blob = await pdfGenerator.generateAllFormsPDF(generatedACORDForms);
      pdfGenerator.downloadPDF(blob, `ACORD_Forms_${formData.businessName || 'Application'}.pdf`);
    } catch (error) {
      console.error('Error downloading forms:', error);
    }
  };

  const handlePreviewForm = (form: ACORDForm) => {
    pdfGenerator.previewForm(form);
  };

  const handleDownloadForm = async (form: ACORDForm) => {
    try {
      const blob = await pdfGenerator.generateACORDPDF(form);
      pdfGenerator.downloadPDF(blob, `${form.formType}_${formData.businessName || 'Application'}.pdf`);
    } catch (error) {
      console.error('Error downloading form:', error);
    }
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
      
      // Generate ACORD forms with customer data
      setIsGeneratingForms(true);
      try {
        const customerData: CustomerData = {
          firstName: formData.contactName.split(' ')[0],
          lastName: formData.contactName.split(' ').slice(1).join(' '),
          businessName: formData.businessName,
          federalId: formData.federalId,
          businessType: formData.businessType,
          yearsInBusiness: formData.yearsInBusiness,
          description: formData.description,
          website: formData.website,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          zipCode: formData.zipCode,
          coverageTypes: formData.coverageTypes,
          insuranceType: formData.insuranceType,
          clientType: formData.clientType,
          coverageAnswers: coverageResponses.reduce((acc, response) => {
            acc[response.coverageType] = response.answers;
            return acc;
          }, {} as Record<string, any>)
        };

        const acordForms = acordFormGenerator.generateACORDForms(customerData);
        setGeneratedACORDForms(acordForms);
      } catch (error) {
        console.error('Error generating ACORD forms:', error);
      } finally {
        setIsGeneratingForms(false);
      }
      
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
        // Step 1: Location & Coverage Type (GEICO/Progressive/State Farm style)
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Let's get started!</h3>
              <p className="text-gray-600 mb-6">
                We'll help you find the right insurance coverage. Let's start with your location and what type of insurance you need.
              </p>
              
              {/* ZIP Code Input */}
              <div className="mb-6">
                <Label htmlFor="zipCode" className="text-sm font-medium mb-2 block">
                  ZIP Code *
                </Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="Enter your 5-digit ZIP code"
                  className="max-w-xs"
                  maxLength={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This helps us provide accurate rates for your area
                </p>
              </div>

              {/* Insurance Type Selection */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-4 block">
                  What type of insurance are you looking for? *
                </Label>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card 
                    className={`p-6 cursor-pointer transition-all ${
                      formData.insuranceType === 'personal' 
                        ? 'ring-2 ring-insurance-blue bg-insurance-blue/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, insuranceType: 'personal' }))}
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
                      formData.insuranceType === 'business' 
                        ? 'ring-2 ring-insurance-blue bg-insurance-blue/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, insuranceType: 'business' }))}
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
                      formData.insuranceType === 'both' 
                        ? 'ring-2 ring-insurance-blue bg-insurance-blue/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, insuranceType: 'both' }))}
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

              {/* Social Proof (Progressive style) */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <span className="text-blue-600 text-xs">ℹ</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Join thousands of satisfied customers</h4>
                    <p className="text-sm text-blue-700">
                      Over 15,000 businesses and individuals have streamlined their insurance applications with our platform this year.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 2:
        // Step 2: Client Type (moved from old case 1)
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Tell us about yourself</h3>
              <p className="text-gray-600 mb-6">
                Are you applying for personal or business insurance? This helps us provide the right coverage options and questions for your needs.
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

      case 3:
        // Step 3: Coverage Needs Selection (moved from old case 2)
        const coverageCategories = coverageQuestionsService.getCoverageTypesByCategory(formData.clientType);
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What coverage do you need?</h3>
              <p className="text-gray-600 mb-6">
                Select the types of insurance coverage you're looking for. We'll ask specific questions about each type you select.
              </p>
              
              {Object.entries(coverageCategories).map(([category, coverages]) => (
                <div key={category} className="mb-8">
                  <h4 className="text-md font-semibold mb-4 text-gray-800">
                    {coverageQuestionsService.getCategoryDisplayName(category)}
                  </h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coverages.map((coverage) => (
                      <Card 
                        key={coverage.id}
                        className={`p-4 cursor-pointer transition-all ${
                          formData.coverageTypes.includes(coverage.id)
                            ? 'ring-2 ring-insurance-blue bg-insurance-blue/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleCoverageChange(coverage.id, !formData.coverageTypes.includes(coverage.id))}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">{coverage.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Checkbox 
                                checked={formData.coverageTypes.includes(coverage.id)}
                                onChange={() => {}} // Handled by Card onClick
                              />
                              <h5 className="font-medium text-sm">{coverage.name}</h5>
                            </div>
                            <p className="text-xs text-gray-600">{coverage.description}</p>
                            <div className="mt-2">
                              {coverage.acordForms.map((form, index) => (
                                <Badge key={index} variant="outline" className="text-xs mr-1">
                                  {form}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 text-xs">ℹ</span>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Need Help Choosing?</h4>
                  <p className="text-sm text-blue-700">
                    Don't worry if you're not sure which coverage you need. You can always add or remove coverage types later, 
                    and our system will guide you through the specific questions for each type you select.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );

      case 4:
        // Step 4: Coverage Questions (moved from old case 3)
        const selectedCoverageQuestions = coverageQuestionsService.getQuestionsForCoverages(
          formData.coverageTypes, 
          formData.clientType
        );

        if (selectedCoverageQuestions.length === 0) {
          return (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Coverage Selected</h3>
                <p className="text-gray-600 mb-4">
                  Please go back and select at least one type of coverage to continue.
                </p>
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Coverage Selection
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Coverage-Specific Questions</h3>
              <p className="text-gray-600 mb-6">
                Please answer these questions about the coverage types you selected. This helps us provide accurate quotes and generate the right ACORD forms.
              </p>
            </div>

            <div className="space-y-6">
              {selectedCoverageQuestions.map((question) => (
                <Card key={question.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Label htmlFor={question.id} className="text-sm font-medium">
                        {question.question}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                    </div>
                    
                    {question.description && (
                      <p className="text-xs text-gray-600">{question.description}</p>
                    )}

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
                        placeholder={question.placeholder}
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
                          <SelectValue placeholder={question.placeholder || "Select an option"} />
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
                              checked={Array.isArray(coverageResponses[question.id]) 
                                ? (coverageResponses[question.id] as string[]).includes(option)
                                : false
                              }
                              onCheckedChange={(checked) => {
                                const currentValues = Array.isArray(coverageResponses[question.id]) 
                                  ? coverageResponses[question.id] as string[]
                                  : [];
                                
                                if (checked) {
                                  handleCoverageQuestionChange(question.id, [...currentValues, option]);
                                } else {
                                  handleCoverageQuestionChange(question.id, currentValues.filter(v => v !== option));
                                }
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

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start space-x-3">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Great Progress!</h4>
                  <p className="text-sm text-green-700">
                    These answers will help us generate accurate ACORD forms and provide you with the best coverage options.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );

      case 5:
        // Step 5: Personal/Business Information (moved from old case 4)
        if (formData.clientType === 'personal') {
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                <p className="text-gray-600 mb-6">Tell us about yourself</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input 
                    id="firstName" 
                    value={formData.contactName.split(' ')[0] || ''}
                    onChange={(e) => {
                      const lastName = formData.contactName.split(' ').slice(1).join(' ');
                      setFormData(prev => ({ ...prev, contactName: `${e.target.value} ${lastName}`.trim() }));
                    }}
                    placeholder="Enter your first name" 
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input 
                    id="lastName" 
                    value={formData.contactName.split(' ').slice(1).join(' ') || ''}
                    onChange={(e) => {
                      const firstName = formData.contactName.split(' ')[0] || '';
                      setFormData(prev => ({ ...prev, contactName: `${firstName} ${e.target.value}`.trim() }));
                    }}
                    placeholder="Enter your last name" 
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input 
                    id="dateOfBirth" 
                    type="date"
                    value={formData.dateOfBirth || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="ssn">Social Security Number *</Label>
                  <Input 
                    id="ssn" 
                    value={formData.ssn || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ssn: e.target.value }))}
                    placeholder="XXX-XX-XXXX" 
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input 
                    id="occupation" 
                    value={formData.occupation || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                    placeholder="Enter your occupation" 
                  />
                </div>
                <div>
                  <Label htmlFor="employer">Employer</Label>
                  <Input 
                    id="employer" 
                    value={formData.employer || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, employer: e.target.value }))}
                    placeholder="Enter your employer name" 
                  />
                </div>
              </div>
            </div>
          );
        } else if (formData.clientType === 'business') {
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                <p className="text-gray-600 mb-6">Tell us about your business</p>
              </div>
              
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
                  rows={3}
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
        } else {
          // Both personal and business
          return (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Personal Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input 
                      id="firstName" 
                      value={formData.contactName.split(' ')[0] || ''}
                      onChange={(e) => {
                        const lastName = formData.contactName.split(' ').slice(1).join(' ');
                        setFormData(prev => ({ ...prev, contactName: `${e.target.value} ${lastName}`.trim() }));
                      }}
                      placeholder="Enter your first name" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input 
                      id="lastName" 
                      value={formData.contactName.split(' ').slice(1).join(' ') || ''}
                      onChange={(e) => {
                        const firstName = formData.contactName.split(' ')[0] || '';
                        setFormData(prev => ({ ...prev, contactName: `${firstName} ${e.target.value}`.trim() }));
                      }}
                      placeholder="Enter your last name" 
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input 
                      id="dateOfBirth" 
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ssn">Social Security Number *</Label>
                    <Input 
                      id="ssn" 
                      value={formData.ssn || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, ssn: e.target.value }))}
                      placeholder="XXX-XX-XXXX" 
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="occupation">Occupation *</Label>
                    <Input 
                      id="occupation" 
                      value={formData.occupation || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                      placeholder="Enter your occupation" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="employer">Employer</Label>
                    <Input 
                      id="employer" 
                      value={formData.employer || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, employer: e.target.value }))}
                      placeholder="Enter your employer name" 
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Business Information</h4>
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
                    rows={3}
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
            </div>
          );
        }

      case 6:
        // Step 6: Contact Details (moved from old case 5)
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
              <p className="text-gray-600 mb-6">How can we reach you?</p>
            </div>
            
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
                  placeholder="contact@example.com" 
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
              <Label htmlFor="address">Address *</Label>
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
                    <SelectItem value="il">Illinois</SelectItem>
                    <SelectItem value="pa">Pennsylvania</SelectItem>
                    <SelectItem value="oh">Ohio</SelectItem>
                    <SelectItem value="ga">Georgia</SelectItem>
                    <SelectItem value="nc">North Carolina</SelectItem>
                    <SelectItem value="mi">Michigan</SelectItem>
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

      case 7:
        // Step 7: Review & Submit (moved from old case 6)
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

            {submissionResult && (
              <Card className={submissionResult.success ? "border-status-approved" : "border-status-rejected"}>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    {submissionResult.success ? (
                      <CheckCircle className="h-5 w-5 text-status-approved" />
                    ) : (
                      <XCircle className="h-5 w-5 text-status-rejected" />
                    )}
                    <p className={submissionResult.success ? "text-status-approved" : "text-status-rejected"}>
                      {submissionResult.success 
                        ? `Application submitted successfully! Submission ID: ${submissionResult.submissionId}`
                        : `Error: ${submissionResult.error}`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
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
                    
                    {/* ACORD Forms Generation */}
                    {isGeneratingForms ? (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <p className="text-blue-700 font-medium">Generating ACORD Forms...</p>
                        <p className="text-sm text-blue-600">Please wait while we populate your forms with your answers</p>
                      </div>
                    ) : generatedACORDForms.length > 0 ? (
                      <div className="mt-6 text-left">
                        <h4 className="text-lg font-semibold mb-4 text-center">📋 Your ACORD Forms Are Ready!</h4>
                        <div className="grid gap-3 mb-4">
                          {generatedACORDForms.map((form, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div>
                                <h5 className="font-medium text-green-800">{form.formName}</h5>
                                <p className="text-sm text-green-600">{form.formType} • {form.fields.length} fields populated</p>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePreviewForm(form)}
                                  className="text-green-700 border-green-300 hover:bg-green-100"
                                >
                                  Preview
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadForm(form)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-center">
                          <Button
                            onClick={handleDownloadAllForms}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            📥 Download All Forms
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    
                    <p className="text-sm text-muted-foreground mt-4">
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