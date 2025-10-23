import { useState, useEffect } from "react";
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
import { ArrowLeft, ArrowRight, Upload, Save, Shield, CheckCircle, Loader2, LogOut, User as UserIcon, Building2, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formService, BusinessInfo, ContactInfo, CoverageInfo } from "@/services/formService";
import { authService, User as AuthUser } from "@/services/authService";
import { coverageQuestionsService, CoverageQuestion, CoverageResponse, ClientType } from "@/services/coverageQuestionsService";
import { acordFormGenerator, CustomerData, ACORDForm } from "@/services/acordFormGenerator";
import { pdfGenerator } from "@/services/pdfGenerator";
import { validationService, ValidationResult } from "@/services/validationService";

const CustomerIntake = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; submissionId?: string; error?: string } | null>(null);
  const [generatedACORDForms, setGeneratedACORDForms] = useState<ACORDForm[]>([]);
  const [isGeneratingForms, setIsGeneratingForms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationResult | null>(null);
  const [formData, setFormData] = useState({
    // Step 1: Location & Coverage Type
    zipCode: "",
    insuranceType: "" as "personal" | "business" | "both" | "",
    // Step 2: Client Type (auto-populated from insuranceType)
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

  // Auto-populate clientType based on insuranceType
  useEffect(() => {
    if (formData.insuranceType && !formData.clientType) {
      let clientType: ClientType;
      if (formData.insuranceType === 'personal') {
        clientType = 'personal';
      } else if (formData.insuranceType === 'business') {
        clientType = 'business';
      } else {
        clientType = 'business'; // Default to business for 'both' case
      }
      setFormData(prev => ({ ...prev, clientType }));
    }
  }, [formData.insuranceType, formData.clientType]);

  const getStepTitle = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return "Location";
      case 2:
        return "Coverage Type & Options";
      case 3:
        return "Coverage Questions";
      case 4:
        return "Coverage Details";
      case 5:
        if (formData.insuranceType === 'personal') return "Personal Information";
        if (formData.insuranceType === 'business') return "Business Information";
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
        return "Tell us where you're located";
      case 2:
        return "What type of insurance and specific coverage do you need?";
      case 3:
        return "Answer coverage-specific questions";
      case 4:
        return "Provide additional coverage details";
      case 5:
        if (formData.insuranceType === 'personal') return "Tell us about yourself";
        if (formData.insuranceType === 'business') return "Tell us about your business";
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
    { number: 7, title: getStepTitle(7), description: getStepDescription(7) },
  ];

  const getCoverageOptions = () => {
    const clientType = formData.clientType as ClientType;
    const availableCoverages = coverageQuestionsService.getCoverageTypes(clientType);
    
    return availableCoverages.map(coverage => ({
      id: coverage.id,
      label: coverage.name,
      required: coverage.id === 'general-liability' && formData.insuranceType === 'business'
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
    setValidationErrors(null);

    try {
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
          const availableCoverages = coverageQuestionsService.getCoverageTypes(formData.clientType as ClientType);
          const option = availableCoverages.find(opt => opt.id === id);
          return option ? option.name : id;
        }),
        coverageResponses: coverageResponses,
      };

      // Create submission object for validation
      const submission = {
        id: 'temp',
        businessInfo,
        contactInfo,
        coverageInfo,
        clientType: formData.clientType as ClientType,
        status: 'new' as const,
        priority: 'medium' as const,
        submittedAt: new Date(),
        updatedAt: new Date()
      };

      // Validate the submission
      const validation = validationService.validateSubmission(submission);
      setValidationErrors(validation);

      if (!validation.isValid) {
        throw new Error(`Please complete all required fields. ${validation.errors.length} required field(s) missing.`);
      }

      // Submit the form
      const submittedForm = await formService.submitForm(businessInfo, contactInfo, coverageInfo);
      
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
        submissionId: submittedForm.id,
      });

      // Redirect to success page after a delay
      setTimeout(() => {
        navigate(`/broker?submission=${submittedForm.id}`);
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
        // Step 1: Location only
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Where are you located?</h3>
              <p className="text-gray-600 mb-6">
                We'll help you find the right insurance coverage. Let's start with your location to provide accurate rates for your area.
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
        // Step 2: Coverage Type & Options (fused from old steps 2 & 3)
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What type of insurance are you looking for?</h3>
              <p className="text-gray-600 mb-6">
                This helps us provide the right coverage options and questions for your needs.
              </p>
              
              {/* Insurance Type Selection */}
              <div className="mb-8">
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

              {/* Specific Coverage Options - Only show if insurance type is selected */}
              {formData.insuranceType && (
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Select Specific Coverage Types</h4>
                    <p className="text-gray-600 mb-6">
                      Choose the specific types of coverage you need. We'll ask questions about each type you select.
                    </p>
                    
                    <div className="space-y-4">
                      {formData.insuranceType === 'personal' || formData.insuranceType === 'both' ? (
                        <div>
                          <h5 className="font-medium mb-3 text-blue-600">Personal Coverage Options</h5>
                          <div className="grid md:grid-cols-2 gap-3">
                            {['personal-auto', 'homeowners', 'personal-liability', 'life', 'health'].map((coverage) => {
                              const displayNames = {
                                'personal-auto': 'Auto Insurance',
                                'homeowners': 'Home Insurance', 
                                'personal-liability': 'Personal Liability',
                                'life': 'Life Insurance',
                                'health': 'Health Insurance'
                              };
                              return (
                              <div key={coverage} className="flex items-center space-x-2">
                                <Checkbox
                                  id={coverage}
                                  checked={formData.coverageTypes.includes(coverage)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData(prev => ({ 
                                        ...prev, 
                                        coverageTypes: [...prev.coverageTypes, coverage] 
                                      }));
                                    } else {
                                      setFormData(prev => ({ 
                                        ...prev, 
                                        coverageTypes: prev.coverageTypes.filter(type => type !== coverage) 
                                      }));
                                    }
                                  }}
                                />
                                <Label htmlFor={coverage} className="text-sm">{displayNames[coverage as keyof typeof displayNames]}</Label>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      
                      {formData.insuranceType === 'business' || formData.insuranceType === 'both' ? (
                        <div>
                          <h5 className="font-medium mb-3 text-green-600">Business Coverage Options</h5>
                          <div className="grid md:grid-cols-2 gap-3">
                            {['general-liability', 'commercial-auto', 'workers-compensation', 'professional-liability', 'property', 'cyber-liability'].map((coverage) => {
                              const displayNames = {
                                'general-liability': 'General Liability',
                                'commercial-auto': 'Commercial Auto',
                                'workers-compensation': 'Workers Compensation',
                                'professional-liability': 'Professional Liability',
                                'property': 'Property Insurance',
                                'cyber-liability': 'Cyber Liability'
                              };
                              return (
                              <div key={coverage} className="flex items-center space-x-2">
                                <Checkbox
                                  id={coverage}
                                  checked={formData.coverageTypes.includes(coverage)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData(prev => ({ 
                                        ...prev, 
                                        coverageTypes: [...prev.coverageTypes, coverage] 
                                      }));
                                    } else {
                                      setFormData(prev => ({ 
                                        ...prev, 
                                        coverageTypes: prev.coverageTypes.filter(type => type !== coverage) 
                                      }));
                                    }
                                  }}
                                />
                                <Label htmlFor={coverage} className="text-sm">{displayNames[coverage as keyof typeof displayNames]}</Label>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        // Step 3: Coverage Questions (moved from old case 4)
        const groupedCoverageQuestions = coverageQuestionsService.getQuestionsGroupedByCoverage(
          formData.coverageTypes, 
          formData.clientType
        );

        if (Object.keys(groupedCoverageQuestions).length === 0) {
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
                Please answer these questions about the coverage types you selected. This helps us provide accurate quotes and coverage recommendations.
              </p>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedCoverageQuestions).map(([coverageType, questions]) => {
                const coverageDisplayNames = {
                  'personal-auto': 'Personal Auto Insurance',
                  'homeowners': 'Homeowners Insurance',
                  'personal-liability': 'Personal Liability',
                  'life': 'Life Insurance',
                  'health': 'Health Insurance',
                  'general-liability': 'General Liability',
                  'commercial-auto': 'Commercial Auto',
                  'workers-compensation': 'Workers Compensation',
                  'professional-liability': 'Professional Liability',
                  'property': 'Business Property',
                  'cyber-liability': 'Cyber Liability'
                };
                
                return (
                  <Card key={coverageType} className="p-6">
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-blue-600 mb-2">
                        {coverageDisplayNames[coverageType as keyof typeof coverageDisplayNames] || coverageType}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Questions specific to {coverageDisplayNames[coverageType as keyof typeof coverageDisplayNames] || coverageType}
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      {questions.map((question) => (
                        <div key={question.id} className="space-y-2">
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
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start space-x-3">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Great Progress!</h4>
                  <p className="text-sm text-green-700">
                    These answers will help us provide you with accurate quotes and the best coverage options.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );

      case 4:
        // Step 4: Coverage Details (moved from old case 5)
        if (formData.insuranceType === 'personal') {
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
        } else if (formData.insuranceType === 'business') {
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

      case 5:
        // Step 5: Personal/Business Information (moved from old case 6)
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
        // Step 7: Review & Submit
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-status-approved mx-auto mb-3" />
              <h3 className="text-xl font-semibold mb-2">Review Your Information</h3>
              <p className="text-muted-foreground">Please review your information before submitting your application.</p>
            </div>

            {/* Validation Errors Display */}
            {validationErrors && !validationErrors.isValid && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-lg text-red-800">⚠️ Required Fields Missing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700 mb-3">
                    Please complete the following required fields before submitting:
                  </p>
                  <ul className="space-y-1 text-sm text-red-600">
                    {validationErrors.errors.map((error, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>{error.message}</span>
                      </li>
                    ))}
                  </ul>
                  {validationErrors.warnings.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-red-200">
                      <p className="text-red-600 mb-2 font-medium">Recommended fields:</p>
                      <ul className="space-y-1 text-sm text-red-500">
                        {validationErrors.warnings.map((warning, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-400 mr-2">•</span>
                            <span>{warning.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                        const availableCoverages = coverageQuestionsService.getCoverageTypes(formData.clientType as ClientType);
                        const option = availableCoverages.find(opt => opt.id === typeId);
                        return option ? (
                          <Badge key={typeId} variant="secondary">{option.name}</Badge>
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