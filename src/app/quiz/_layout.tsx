import { Stack } from 'expo-router';
import { QuizProvider } from '@/features/quiz/provider';
export default function QuizLayout() {
  return <QuizProvider><Stack screenOptions={{ headerShown: false, animation: 'fade' }} /></QuizProvider>;
}
