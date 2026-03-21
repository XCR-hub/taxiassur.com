import React, { useState } from 'react';
import { PlayCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AutomationTest {
  name: string;
  functionName: string;
  method?: 'GET' | 'POST';
  body?: Record<string, any>;
  description: string;
}

interface TestAutomationButtonProps {
  tests: AutomationTest[];
  title?: string;
}

const TestAutomationButton: React.FC<TestAutomationButtonProps> = ({
  tests,
  title = "Tester les Automatisations"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const testAutomation = async (test: AutomationTest) => {
    setTesting(test.functionName);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${test.functionName}`,
        {
          method: test.method || 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: test.body ? JSON.stringify(test.body) : undefined,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResults(prev => ({
          ...prev,
          [test.functionName]: {
            success: true,
            message: data.message || 'Test réussi'
          }
        }));
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [test.functionName]: {
          success: false,
          message: error.message
        }
      }));
    } finally {
      setTesting(null);
    }
  };

  const testAll = async () => {
    for (const test of tests) {
      await testAutomation(test);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105 z-50"
      >
        <PlayCircle size={20} />
        {title}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl p-6 w-96 max-h-[600px] overflow-auto z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <PlayCircle className="text-purple-600" size={20} />
          {title}
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <button
        onClick={testAll}
        disabled={testing !== null}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 rounded mb-4 transition-colors"
      >
        {testing ? 'Test en cours...' : 'Tester Tout'}
      </button>

      <div className="space-y-3">
        {tests.map((test) => (
          <div key={test.functionName} className="border rounded p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="font-medium text-sm">{test.name}</p>
                <p className="text-xs text-gray-500">{test.description}</p>
              </div>
              {testing === test.functionName && (
                <Loader className="animate-spin text-purple-600" size={16} />
              )}
              {results[test.functionName] && (
                results[test.functionName].success ? (
                  <CheckCircle className="text-green-600" size={16} />
                ) : (
                  <XCircle className="text-red-600" size={16} />
                )
              )}
            </div>

            {results[test.functionName] && (
              <div className={`text-xs p-2 rounded ${
                results[test.functionName].success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {results[test.functionName].message}
              </div>
            )}

            <button
              onClick={() => testAutomation(test)}
              disabled={testing !== null}
              className="mt-2 w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 text-xs py-1 rounded transition-colors"
            >
              Tester
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestAutomationButton;
