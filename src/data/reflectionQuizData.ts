export interface ReflectionQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

export interface ReflectionQuizDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  duration: string;
  gradient: string;
  questions: ReflectionQuestion[];
}

export const reflectionQuizzes: ReflectionQuizDefinition[] = [];
