import { callCloud } from './cloud'
import type { Journey, UserJourney, JourneyStep } from '@/types'

const FN = 'journey'

export interface UserJourneyDetail extends UserJourney {
  journey: Journey | null
}

export interface CompleteStepResult extends UserJourney {
  step: JourneyStep
  unlockHabits: string[]
}

export interface StepDetail {
  step: JourneyStep
  stepIndex: number
  isStepCompleted: boolean
  totalSteps: number
  journeyTitle: string
  currentStep: number
  completedSteps: number[]
}

export async function listPresetJourneys(): Promise<Journey[]> {
  return callCloud<Journey[]>(FN, 'listPreset')
}

export async function getUserJourneys(): Promise<UserJourneyDetail[]> {
  return callCloud<UserJourneyDetail[]>(FN, 'getUserJourneys')
}

export async function startJourney(
  journeyId: string,
): Promise<UserJourneyDetail> {
  return callCloud<UserJourneyDetail>(FN, 'startJourney', { journeyId })
}

export async function completeStep(
  userJourneyId: string,
  stepIndex: number,
): Promise<CompleteStepResult> {
  return callCloud<CompleteStepResult>(FN, 'completeStep', {
    userJourneyId,
    stepIndex,
  })
}

export async function getStepDetail(
  userJourneyId: string,
  stepIndex: number,
): Promise<StepDetail> {
  return callCloud<StepDetail>(FN, 'getStepDetail', {
    userJourneyId,
    stepIndex,
  })
}
