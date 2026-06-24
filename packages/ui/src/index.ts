import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export { Button } from './button';
export { Card, CardHeader, CardTitle, CardContent } from './card';
export { Badge } from './badge';
export { Input } from './input';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Progress } from './progress';
export { Icon } from './icon';
export { ErrorBoundary, SimpleErrorBoundary } from './components/ErrorBoundary';
