import { UserList } from './components/UserList';
import { ThemeExample } from './components/ThemeExample';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Welcome to Our Next.js + Apollo App</h1>
      <div className="max-w-4xl mx-auto space-y-8">
        <ThemeExample />
        <UserList />
      </div>
    </main>
  );
}
