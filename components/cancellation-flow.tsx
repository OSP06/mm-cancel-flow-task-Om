"use client"

import type React from "react"
import { useState, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft } from "lucide-react"
import { useCancellationFlow } from "@/hooks/usecancellationflow"

// Flow step types - represents all possible states in the cancellation flow
type FlowStep =
  | "job-question"
  | "survey"
  | "feedback"
  | "congratulations"
  | "visa-support"
  | "visa-yes"
  | "visa-no"
  | "success"
  | "success-alt"
  | "retention-offer"
  | "retention-accepted"
  | "retention-survey"
  | "retention-reason"
  | "retention-price"
  | "retention-platform"
  | "retention-jobs"
  | "retention-move"
  | "retention-other"
  | "retention-final"

// Data structures for different sections of the flow
interface SurveyData {
  foundJobWithMM: boolean | null
  rolesApplied: string | null
  companiesEmailed: string | null
  companiesInterviewed: string | null
}

interface RetentionData {
  rolesApplied: string | null
  companiesEmailed: string | null
  companiesInterviewed: string | null
  cancellationReason: string | null
  maxPrice: string
  reasonFeedback: string
}

// Main flow state interface
interface FlowState {
  step: FlowStep
  hasJob: boolean | null
  surveyData: SurveyData
  feedback: string
  hasLawyer: boolean | null
  visaType: string
  completedSteps: number
  retentionData: RetentionData
}

interface CancellationFlowProps {
  onClose?: (cancelled?: boolean) => void  // optional cancelled parameter
  userId?: string
  subscriptionId?: string
}

// Constants for better maintainability
const ROLE_OPTIONS = ["0", "1-5", "6-20", "20+"] as const
const INTERVIEW_OPTIONS = ["0", "1-2", "3-5", "5+"] as const
const CANCELLATION_REASONS = [
  "Too expensive",
  "Platform not helpful",
  "Not enough relevant jobs",
  "Decided not to move",
  "Other",
] as const

// Minimum character requirements
const MIN_FEEDBACK_LENGTH = 25

export default function CancellationFlow({
  onClose,
  userId = "demo-user",
  subscriptionId = "demo-subscription",
}: CancellationFlowProps = {}) {
  const { variant, loading, error, submitCancellation } = useCancellationFlow(userId, subscriptionId)

  // Initial state configuration
  const initialState: FlowState = useMemo(() => ({
    step: "job-question",
    hasJob: null,
    surveyData: {
      foundJobWithMM: null,
      rolesApplied: null,
      companiesEmailed: null,
      companiesInterviewed: null,
    },
    feedback: "",
    hasLawyer: null,
    visaType: "",
    completedSteps: 0,
    retentionData: {
      rolesApplied: null,
      companiesEmailed: null,
      companiesInterviewed: null,
      cancellationReason: null,
      maxPrice: "",
      reasonFeedback: "",
    },
  }), [])

  const [flowState, setFlowState] = useState<FlowState>(initialState)
  const [isOpen, setIsOpen] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Memoized validation functions for better performance
  const isSurveyValid = useMemo(() => 
    flowState.surveyData.foundJobWithMM !== null &&
    flowState.surveyData.rolesApplied &&
    flowState.surveyData.companiesEmailed &&
    flowState.surveyData.companiesInterviewed
  , [flowState.surveyData])

  const isRetentionSurveyValid = useMemo(() => 
    flowState.retentionData.rolesApplied &&
    flowState.retentionData.companiesEmailed &&
    flowState.retentionData.companiesInterviewed
  , [flowState.retentionData])

  const isFeedbackValid = useMemo(() => 
    flowState.feedback.length >= MIN_FEEDBACK_LENGTH
  , [flowState.feedback.length])

  const isReasonFeedbackValid = useMemo(() => 
    flowState.retentionData.reasonFeedback.length >= MIN_FEEDBACK_LENGTH
  , [flowState.retentionData.reasonFeedback.length])

  // Navigation and flow control handlers
  const handleJobResponse = useCallback((hasJob: boolean) => {
    setFlowState(prev => ({
      ...prev,
      hasJob,
      step: hasJob ? "survey" : "retention-offer",
    }))
  }, [])

  const handleSurveySubmit = useCallback(() => {
    setFlowState(prev => ({ ...prev, step: "feedback", completedSteps: 1 }))
  }, [])

  const handleFeedbackSubmit = useCallback(() => {
    setFlowState(prev => ({ ...prev, step: "congratulations", completedSteps: 2 }))
  }, [])

  const handleCongratulationsNext = useCallback(() => {
    setFlowState(prev => ({ ...prev, step: "visa-support", completedSteps: 3 }))
  }, [])

  const handleVisaSupportResponse = useCallback((hasLawyer: boolean) => {
    setFlowState(prev => ({
      ...prev,
      hasLawyer,
      step: hasLawyer ? "visa-yes" : "visa-no",
    }))
  }, [])

  const handleVisaDetailsSubmit = useCallback(() => {
    submitCancellation(false, "Completed visa support flow")
    setFlowState(prev => ({
      ...prev,
      step: flowState.hasLawyer ? "success" : "success-alt",
    }))
  }, [flowState.hasLawyer, submitCancellation])

  const handleRetentionOffer = useCallback((accepted: boolean) => {
    if (accepted) {
      submitCancellation(true, "Accepted retention offer")
    }
    setFlowState(prev => ({
      ...prev,
      step: accepted ? "retention-accepted" : "retention-survey",
      completedSteps: accepted ? 0 : 1,
    }))
  }, [submitCancellation])

  const handleRetentionSurveySubmit = useCallback(() => {
    setFlowState(prev => ({ ...prev, step: "retention-reason", completedSteps: 2 }))
  }, [])

  // Dynamic routing based on cancellation reason
  const handleRetentionReasonSubmit = useCallback(() => {
    const reason = flowState.retentionData.cancellationReason
    const stepMap: Record<string, FlowStep> = {
      "Too expensive": "retention-price",
      "Platform not helpful": "retention-platform",
      "Not enough relevant jobs": "retention-jobs",
      "Decided not to move": "retention-move",
      "Other": "retention-other",
    }
    
    const nextStep = reason && stepMap[reason] ? stepMap[reason] : "retention-final"
    setFlowState(prev => ({ ...prev, step: nextStep, completedSteps: 3 }))
  }, [flowState.retentionData.cancellationReason])

  const handleReasonFeedbackSubmit = useCallback(() => {
    const { cancellationReason, reasonFeedback } = flowState.retentionData
    submitCancellation(false, `${cancellationReason}: ${reasonFeedback}`)
    setFlowState(prev => ({ ...prev, step: "retention-final", completedSteps: 3 }))
  }, [flowState.retentionData, submitCancellation])

  const handleRetentionPriceSubmit = useCallback(() => {
    const maxPrice = flowState.retentionData.maxPrice
    submitCancellation(false, `Too expensive - willing to pay: $${maxPrice}`)
    setFlowState(prev => ({ ...prev, step: "retention-final", completedSteps: 3 }))
  }, [flowState.retentionData.maxPrice, submitCancellation])

  // Back navigation logic
  const goBack = useCallback(() => {
    const backMap: Partial<Record<FlowStep, FlowStep>> = {
      "survey": "job-question",
      "feedback": "survey",
      "congratulations": "feedback",
      "visa-support": "congratulations",
      "visa-yes": "visa-support",
      "visa-no": "visa-support",
      "retention-offer": "job-question",
      "retention-survey": "retention-offer",
      "retention-reason": "retention-survey",
      "retention-price": "retention-reason",
    }

    const prevStep = backMap[flowState.step]
    if (prevStep) {
      setFlowState(prev => ({
        ...prev,
        step: prevStep,
        ...(prevStep === "visa-support" && { hasLawyer: null })
      }))
    }
  }, [flowState.step])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    onClose?.() // This is for normal close (X button)
  }, [onClose])

  // Optimized change handlers
  const handleFeedbackChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFlowState(prev => ({ ...prev, feedback: e.target.value }))
  }, [])

  const handleReasonFeedbackChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFlowState(prev => ({
      ...prev,
      retentionData: { ...prev.retentionData, reasonFeedback: e.target.value },
    }))
  }, [])

  const handleVisaTypeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFlowState(prev => ({ ...prev, visaType: e.target.value }))
  }, [])

  const handleMaxPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFlowState(prev => ({
      ...prev,
      retentionData: { ...prev.retentionData, maxPrice: e.target.value },
    }))
  }, [])

  // Helper function to update survey data
  const updateSurveyData = useCallback((field: keyof SurveyData, value: any) => {
    setFlowState(prev => ({
      ...prev,
      surveyData: { ...prev.surveyData, [field]: value },
    }))
  }, [])

  // Helper function to update retention data
  const updateRetentionData = useCallback((field: keyof RetentionData, value: any) => {
    setFlowState(prev => ({
      ...prev,
      retentionData: { ...prev.retentionData, [field]: value },
    }))
  }, [])

  // Reusable button component for option selection
  const OptionButton = useCallback(({ 
    option, 
    isSelected, 
    onClick,
    variant = "default" 
  }: { 
    option: string
    isSelected: boolean
    onClick: () => void
    variant?: "default" | "primary"
  }) => (
    <Button
      onClick={onClick}
      className={`px-4 py-2 rounded-full border-2 transition-all ${
        isSelected
          ? variant === "primary" 
            ? "bg-primary text-primary-foreground border-purple-600 shadow-md"
            : "bg-foreground text-background border-gray-800 shadow-md"
          : "bg-card text-muted-foreground border-border hover:border-gray-400 hover:shadow-sm"
      }`}
    >
      {option}
    </Button>
  ), [])

  // Loading and error states
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-2xl p-8 shadow-xl">
          <div className="text-center">Loading cancellation flow...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-2xl p-8 shadow-xl">
          <div className="text-center text-destructive">
            <p>Error loading cancellation flow:</p>
            <p className="text-sm mt-2">{error}</p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!variant || !isOpen) return null

  // Determine if back button should be shown
  const showBackButton = !["job-question", "retention-offer"].includes(flowState.step)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-6xl h-[700px] flex flex-col overflow-hidden">
        {/* Header with navigation and close button */}
        <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border/20">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <button 
                onClick={goBack} 
                className="p-2 hover:bg-muted rounded-full text-foreground transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="text-lg font-medium text-foreground">
                Subscription Cancellation
              </h1>
              {process.env.NODE_ENV === "development" && (
                <span className="text-xs text-muted-foreground">
                  Variant: {variant} | Step: {flowState.step}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={closeModal} 
            className="p-2 hover:bg-muted rounded-full text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main content area with left/right panels */}
        <div className="flex flex-1">
          {/* Left side - Content */}
          <div className="flex-1 px-8 py-6 flex flex-col">
            {/* Content area that grows to fill available space */}
            <div className="flex-1 flex flex-col justify-center min-h-0">
              
              {/* Initial job question step */}
              {flowState.step === "job-question" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold italic text-foreground">Hey mate,</h2>
                    <h3 className="text-2xl font-bold italic text-foreground">Quick one before you go.</h3>
                    <p className="text-2xl font-bold italic text-foreground">Have you found a job yet?</p>
                    <p className="text-xl italic text-foreground">
                      Whatever your answer, we just want to help you take the next step. 
                      With visa support, or by hearing how we can do better.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button 
                      onClick={() => handleJobResponse(true)} 
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-3"
                    >
                      Yes, I've found a job
                    </Button>
                    <Button 
                      onClick={() => handleJobResponse(false)} 
                      className="w-full bg-secondary text-secondary-foreground hover:bg-muted transition-colors py-3"
                    >
                      Not yet - I'm still looking
                    </Button>
                  </div>
                </div>
              )}

              {/* Survey step for users who found jobs */}
              {flowState.step === "survey" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">Congrats on the new role! 🎉</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Question 1: Found job with MigrateMate */}
                    <div>
                      <p className="text-foreground mb-3">Did you find this job with MigrateMate?*</p>
                      <div className="flex gap-4">
                        <OptionButton
                          option="Yes"
                          isSelected={flowState.surveyData.foundJobWithMM === true}
                          onClick={() => updateSurveyData('foundJobWithMM', true)}
                        />
                        <OptionButton
                          option="No"
                          isSelected={flowState.surveyData.foundJobWithMM === false}
                          onClick={() => updateSurveyData('foundJobWithMM', false)}
                        />
                      </div>
                    </div>

                    {/* Question 2: Roles applied */}
                    <div>
                      <p className="text-foreground mb-3">How many roles did you apply for through Migrate Mate?*</p>
                      <div className="flex gap-3 flex-wrap">
                        {ROLE_OPTIONS.map((option) => (
                          <OptionButton
                            key={option}
                            option={option}
                            isSelected={flowState.surveyData.rolesApplied === option}
                            onClick={() => updateSurveyData('rolesApplied', option)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Question 3: Companies emailed */}
                    <div>
                      <p className="text-foreground mb-3">How many companies did you email directly?*</p>
                      <div className="flex gap-3 flex-wrap">
                        {ROLE_OPTIONS.map((option) => (
                          <OptionButton
                            key={option}
                            option={option}
                            isSelected={flowState.surveyData.companiesEmailed === option}
                            onClick={() => updateSurveyData('companiesEmailed', option)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Question 4: Companies interviewed with */}
                    <div>
                      <p className="text-foreground mb-3">How many different companies did you interview with?*</p>
                      <div className="flex gap-3 flex-wrap">
                        {INTERVIEW_OPTIONS.map((option) => (
                          <OptionButton
                            key={option}
                            option={option}
                            isSelected={flowState.surveyData.companiesInterviewed === option}
                            onClick={() => updateSurveyData('companiesInterviewed', option)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSurveySubmit}
                    disabled={!isSurveyValid}
                    variant="outline"
                    className="w-full py-3"
                  >
                    Continue
                  </Button>
                </div>
              )}

              {/* Feedback step */}
              {flowState.step === "feedback" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">
                      What's one thing you wish we could've helped you with?
                    </h2>
                    <p className="text-muted-foreground">
                      We're always looking to improve, your thoughts can help us make Migrate Mate more useful for others.*
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={flowState.feedback}
                      onChange={handleFeedbackChange}
                      className="w-full h-32 p-4 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      placeholder="Your feedback..."
                      maxLength={500}
                    />
                    <div className="absolute bottom-3 right-3 text-sm text-muted-foreground bg-card px-2 rounded">
                      Min {MIN_FEEDBACK_LENGTH} characters ({flowState.feedback.length}/{MIN_FEEDBACK_LENGTH})
                    </div>
                  </div>

                  <Button 
                    onClick={handleFeedbackSubmit} 
                    disabled={!isFeedbackValid} 
                    variant="outline" 
                    className="w-full py-3"
                  >
                    Continue
                  </Button>
                </div>
              )}

              {/* Congratulations step */}
              {flowState.step === "congratulations" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">You landed the job!</h2>
                    <h3 className="text-3xl font-bold italic text-foreground">That's what we live for.</h3>
                    <p className="text-muted-foreground">
                      Even if it wasn't through Migrate Mate,<br />
                      let us help get your visa sorted.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Is your company providing an immigration lawyer to help with your visa?
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors">
                      <input
                        type="radio"
                        name="lawyer"
                        checked={flowState.hasLawyer === true}
                        onChange={() => setFlowState(prev => ({ ...prev, hasLawyer: true }))}
                        className="w-4 h-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors">
                      <input
                        type="radio"
                        name="lawyer"
                        checked={flowState.hasLawyer === false}
                        onChange={() => setFlowState(prev => ({ ...prev, hasLawyer: false }))}
                        className="w-4 h-4"
                      />
                      <span>No</span>
                    </label>
                  </div>

                  <Button 
                    onClick={handleCongratulationsNext} 
                    disabled={flowState.hasLawyer === null} 
                    variant="outline" 
                    className="w-full py-3"
                  >
                    Complete cancellation
                  </Button>
                </div>
              )}

              {/* Visa support steps */}
              {flowState.step === "visa-support" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">
                      We helped you land the job, now let's help you secure your visa.
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Is your company providing an immigration lawyer to help with your visa?
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors">
                      <input
                        type="radio"
                        name="visa-lawyer"
                        checked={flowState.hasLawyer === true}
                        onChange={() => handleVisaSupportResponse(true)}
                        className="w-4 h-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors">
                      <input
                        type="radio"
                        name="visa-lawyer"
                        checked={flowState.hasLawyer === false}
                        onChange={() => handleVisaSupportResponse(false)}
                        className="w-4 h-4"
                      />
                      <span>No</span>
                    </label>
                  </div>

                  <Button
                    onClick={() => flowState.hasLawyer !== null && handleVisaSupportResponse(flowState.hasLawyer)}
                    disabled={flowState.hasLawyer === null}
                    variant="outline" 
                    className="w-full py-3"
                  >
                    Complete cancellation
                  </Button>
                </div>
              )}

              {/* Visa details steps */}
              {(flowState.step === "visa-yes" || flowState.step === "visa-no") && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">
                      We helped you land the job, now let's help you secure your visa.
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Is your company providing an immigration lawyer to help with your visa?
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-foreground rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-card rounded-full" />
                      </div>
                      <span>{flowState.hasLawyer ? "Yes" : "No"}</span>
                    </div>
                    {flowState.step === "visa-no" && (
                      <p className="text-muted-foreground">We can connect you with one of our trusted partners.</p>
                    )}
                    <p className="text-foreground">
                      {flowState.step === "visa-yes" ? "What visa will you be applying for?" : "Which visa would you like to apply for?"}*
                    </p>
                  </div>

                  <input
                    type="text"
                    value={flowState.visaType}
                    onChange={handleVisaTypeChange}
                    className="w-full p-4 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="Enter visa type..."
                    maxLength={100}
                  />

                  <Button 
                    onClick={handleVisaDetailsSubmit} 
                    disabled={!flowState.visaType.trim()} 
                    variant="outline" 
                    className="w-full py-3"
                  >
                    Complete cancellation
                  </Button>
                </div>
              )}

              {/* Success steps */}
              {flowState.step === "success" && (
                <div className="space-y-8">
                  <div className="space-y-4 text-center">
                    <h2 className="text-3xl font-bold text-foreground">All done, your cancellation's been processed.</h2>
                    <p className="text-muted-foreground">We're stoked to hear you've landed a job and sorted your visa.</p>
                    <p className="text-muted-foreground">Big congrats from the team. 🙌</p>
                  </div>

                  <Button onClick={() => onClose?.(true)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3">
                    Finish
                  </Button>
                </div>
              )}

              {flowState.step === "success-alt" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">
                      Your cancellation's all sorted, mate, no more charges.
                    </h2>

                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                      <img 
                        src="/professional-headshot.png" 
                        alt="Mihailo Bozic" 
                        className="w-10 h-10 rounded-full" 
                      />
                      <div>
                        <p className="font-semibold text-foreground">Mihailo Bozic</p>
                        <p className="text-sm text-muted-foreground">&lt;mihailo@migratemate.co&gt;</p>
                      </div>
                    </div>

                    <p className="text-gray-800">I'll be reaching out soon to help with the visa side of things.</p>
                    <p className="text-muted-foreground">
                      We've got your back, whether it's questions, paperwork, or just figuring out your options.
                    </p>
                    <p className="text-muted-foreground">
                      You'll still have full access until then. No further charges after that.
                    </p>
                    <p className="text-muted-foreground">
                      Changed your mind? You can reactivate anytime before your end date.
                    </p>
                  </div>

                  <Button onClick={() => onClose?.(true)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3">
                    Finish
                  </Button>
                </div>
              )}

              {/* Retention flow steps */}
              {flowState.step === "retention-offer" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">
                      We built this to help you land the job, this makes it a little easier.
                    </h2>
                    <p className="text-muted-foreground">We've been there and we're here to help you.</p>
                  </div>

                  <div className="bg-purple-100 rounded-2xl p-6 border border-purple-200">
                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold text-foreground">
                        Here's <span className="font-bold text-purple-600">50% off</span> until you find a job.
                      </p>
                      <p className="text-3xl font-bold text-purple-600">$12.50/month</p>
                      <p className="text-muted-foreground line-through">$25/month</p>
                    </div>
                    <Button
                      onClick={() => handleRetentionOffer(true)}
                      className="w-full mt-4 bg-accent hover:bg-accent/90 text-primary-foreground py-3"
                    >
                      Get 50% off
                    </Button>
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      You won't be charged until your next billing date.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleRetentionOffer(false)}
                    className="w-full bg-card border border-border text-muted-foreground hover:bg-muted py-3"
                  >
                    No thanks
                  </Button>
                </div>
              )}

              {flowState.step === "retention-accepted" && (
                <div className="space-y-8">
                  <div className="space-y-4 text-center">
                    <h2 className="text-3xl font-bold text-foreground">Great choice, mate!</h2>
                    <p className="text-gray-800">You're still on the path to your dream role.</p>
                    <p className="text-purple-600 font-semibold">Let's make it happen together!</p>
                    <div className="space-y-2 text-muted-foreground">
                      <p>You've got XX days left on your current plan.</p>
                      <p>Starting from XX date, your monthly payment will be $12.50.</p>
                      <p className="text-sm italic">You can cancel anytime before then.</p>
                    </div>
                  </div>

                  <Button onClick={closeModal} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3">
                    Land your dream role
                  </Button>
                </div>
              )}

              {/* Retention survey - similar to main survey but for retention flow */}
              {flowState.step === "retention-survey" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">
                      Help us understand how you were using Migrate Mate.
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Retention Question 1: Roles applied */}
                    <div>
                      <p className="text-muted-foreground text-sm mb-3">
                        How many roles did you <span className="underline">apply</span> for through Migrate Mate?
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        {ROLE_OPTIONS.map((option) => (
                          <OptionButton
                            key={option}
                            option={option}
                            isSelected={flowState.retentionData.rolesApplied === option}
                            onClick={() => updateRetentionData('rolesApplied', option)}
                            variant="primary"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Retention Question 2: Companies emailed */}
                    <div>
                      <p className="text-foreground mb-3">How many companies did you email directly?</p>
                      <div className="flex gap-3 flex-wrap">
                        {ROLE_OPTIONS.map((option) => (
                          <OptionButton
                            key={option}
                            option={option}
                            isSelected={flowState.retentionData.companiesEmailed === option}
                            onClick={() => updateRetentionData('companiesEmailed', option)}
                            variant="primary"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Retention Question 3: Companies interviewed with */}
                    <div>
                      <p className="text-muted-foreground text-sm mb-3">
                        How many different companies did you <span className="underline">interview</span> with?
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        {INTERVIEW_OPTIONS.map((option) => (
                          <OptionButton
                            key={option}
                            option={option}
                            isSelected={flowState.retentionData.companiesInterviewed === option}
                            onClick={() => updateRetentionData('companiesInterviewed', option)}
                            variant="primary"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons - retention offer vs continue */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleRetentionOffer(true)}
                      className="flex-1 bg-accent hover:bg-accent/90 text-primary-foreground py-3"
                    >
                      Get 50% off | $12.50 <span className="line-through text-green-200 ml-1">$25</span>
                    </Button>
                    <Button
                      onClick={handleRetentionSurveySubmit}
                      disabled={!isRetentionSurveyValid}
                      className={`flex-1 transition-colors py-3 ${
                        isRetentionSurveyValid
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-gray-300 text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Retention reason selection */}
              {flowState.step === "retention-reason" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">What's the main reason for cancelling?</h2>
                    <p className="text-muted-foreground">Please take a minute to let us know why:</p>
                    <p className="text-destructive text-sm">
                      To help us understand your experience, please select a reason for cancelling*
                    </p>
                  </div>

                  <div className="space-y-3">
                    {CANCELLATION_REASONS.map((reason) => (
                      <label key={reason} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors">
                        <input
                          type="radio"
                          name="cancellation-reason"
                          checked={flowState.retentionData.cancellationReason === reason}
                          onChange={() => updateRetentionData('cancellationReason', reason)}
                          className="w-4 h-4"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleRetentionOffer(true)}
                      className="flex-1 bg-accent hover:bg-accent/90 text-primary-foreground py-3"
                    >
                      Get 50% off | $12.50 <span className="line-through text-green-200 ml-1">$25</span>
                    </Button>
                    <Button
                      onClick={handleRetentionReasonSubmit}
                      disabled={!flowState.retentionData.cancellationReason}
                      className={`flex-1 transition-colors py-3 ${
                        flowState.retentionData.cancellationReason
                          ? "bg-foreground text-background hover:bg-gray-900"
                          : "bg-gray-300 text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      Complete cancellation
                    </Button>
                  </div>
                </div>
              )}

              {/* Price feedback step */}
              {flowState.step === "retention-price" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">What's the main reason for cancelling?</h2>
                    <p className="text-muted-foreground">Please take a minute to let us know why:</p>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-foreground rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-card rounded-full" />
                      </div>
                      <span>Too expensive</span>
                    </div>
                    <p className="text-foreground">What would be the maximum you would be willing to pay?*</p>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.01"
                      value={flowState.retentionData.maxPrice}
                      onChange={handleMaxPriceChange}
                      className="w-full pl-8 pr-4 py-4 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleRetentionOffer(true)}
                      className="flex-1 bg-accent hover:bg-accent/90 text-primary-foreground py-3"
                    >
                      Get 50% off | $12.50 <span className="line-through text-green-200 ml-1">$25</span>
                    </Button>
                    <Button
                      onClick={handleRetentionPriceSubmit}
                      disabled={!flowState.retentionData.maxPrice.trim()}
                      className={`flex-1 transition-colors py-3 ${
                        flowState.retentionData.maxPrice.trim()
                          ? "bg-foreground text-background hover:bg-gray-900"
                          : "bg-gray-300 text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      Complete cancellation
                    </Button>
                  </div>
                </div>
              )}

              {/* Generic feedback steps for different retention reasons */}
              {["retention-platform", "retention-jobs", "retention-move", "retention-other"].includes(flowState.step) && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">What's the main reason?</h2>
                    <p className="text-muted-foreground">Please take a minute to let us know why:</p>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-foreground rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-card rounded-full" />
                      </div>
                      <span>{flowState.retentionData.cancellationReason}</span>
                    </div>
                    <p className="text-gray-800">
                      {flowState.step === "retention-platform" && "What can we change to make the platform more helpful?*"}
                      {flowState.step === "retention-jobs" && "In which way can we make the jobs more relevant?*"}
                      {flowState.step === "retention-move" && "What changed for you to decide to not move?*"}
                      {flowState.step === "retention-other" && "What would have helped you the most?*"}
                    </p>
                    <p className="text-destructive text-sm">
                      Please enter at least {MIN_FEEDBACK_LENGTH} characters so we can understand your feedback*
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      value={flowState.retentionData.reasonFeedback}
                      onChange={handleReasonFeedbackChange}
                      className="w-full h-32 p-4 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      placeholder={
                        flowState.step === "retention-platform" ? "Tell us what would make the platform more helpful..." :
                        flowState.step === "retention-jobs" ? "Tell us how we can make jobs more relevant..." :
                        flowState.step === "retention-move" ? "Tell us what changed your mind about moving..." :
                        "Tell us what would have helped you the most..."
                      }
                      maxLength={500}
                    />
                    <div className="absolute bottom-3 right-3 text-sm text-muted-foreground bg-card px-2 rounded">
                      Min {MIN_FEEDBACK_LENGTH} characters ({flowState.retentionData.reasonFeedback.length}/{MIN_FEEDBACK_LENGTH})
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleRetentionOffer(true)}
                      className="flex-1 bg-accent hover:bg-accent/90 text-primary-foreground py-3"
                    >
                      Get 50% off | $12.50 <span className="line-through text-green-200 ml-1">$25</span>
                    </Button>
                    <Button
                      onClick={handleReasonFeedbackSubmit}
                      disabled={!isReasonFeedbackValid}
                      className={`flex-1 transition-colors py-3 ${
                        isReasonFeedbackValid
                          ? "bg-foreground text-background hover:bg-gray-900"
                          : "bg-gray-300 text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      Complete cancellation
                    </Button>
                  </div>
                </div>
              )}

              {/* Final retention step */}
              {flowState.step === "retention-final" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">Sorry to see you go, mate.</h2>
                    <p className="text-gray-800">Thanks for being with us, and you're always welcome back.</p>
                    <div className="space-y-2 text-muted-foreground">
                      <p>Your subscription is set to end on XX date.</p>
                      <p>You'll still have full access until then. No further charges after that.</p>
                      <p>Changed your mind? You can reactivate anytime before your end date.</p>
                    </div>
                  </div>

                  <Button onClick={() => onClose?.(true)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3">
                    Back to Jobs
                  </Button>
                </div>
              )}

            </div>
          </div>

          {/* Right side - Image panel (centered and optimized) */}
          <div className="flex-1 relative hidden md:flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-r-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50"></div>
            <div className="relative z-10 flex items-center justify-center h-full w-full p-8">
              <img 
                src="/images/cityscape.jpg" 
                alt="City skyline representing career opportunities" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg" 
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
