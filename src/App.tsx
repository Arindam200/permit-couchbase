import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function App() {
  const [query, setQuery] = useState('');
  const [userId, setUser] = useState('');
  const [result, setResult] = useState<null | { success: boolean; results?: any[]; error?: string }>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, userId }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, error: 'An error occurred while processing your request.' });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Permission Checker</CardTitle>
          <CardDescription>Enter a query and user to check permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-gray-700">Query</label>
              <Textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your N1QL query here"
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700">User</label>
              <Input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Enter user"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full">Check Permissions</Button>
          </form>
        </CardContent>
        <CardFooter>
          {result && (
            <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
              {result.success ? (
                <div>
                  <h3 className="font-bold text-green-800">Permission Granted</h3>
                  <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(result.results, null, 2)}</pre>
                </div>
              ) : (
                <div>
                  <h3 className="font-bold text-red-800">Permission Denied</h3>
                  <p>{result.error}</p>
                </div>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
