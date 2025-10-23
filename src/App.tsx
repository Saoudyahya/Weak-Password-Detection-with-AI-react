// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Shield, Lock, Key, Brain, Zap, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Copy, RefreshCw, Info } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

// Type Definitions
interface AnalysisResult {
  password: string;
  length: number;
  predictions: Record<string, string>;
  consensus: string;
  agreement_percentage: number;
  metrics: {
    shannon_entropy: number;
    practical_entropy: number;
  };
  composition: {
    lowercase: number;
    uppercase: number;
    digits: number;
    symbols: number;
    spaces: number;
    unique: number;
  };
  crack_time: {
    online_throttled: string;
    online_fast: string;
    offline_gpu: string;
    offline_super: string;
  };
  patterns: string[];
  dictionary_words: string[];
  suggestions: string[];
  warnings: string[];
  is_breached: boolean;
  breach_count: number;
}

interface GeneratedPassword {
  password: string;
  metadata: {
    length: number;
    entropy: number;
    crack_time_gpu: string;
  };
}

interface HealthStatus {
  status: string;
  models_loaded: boolean;
  available_models: string[];
  breach_database_size: number;
}

type TabType = 'analyze' | 'generate' | 'passphrase';
type ApiStatusType = 'checking' | 'healthy' | 'no-models' | 'offline';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('analyze');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [apiStatus, setApiStatus] = useState<ApiStatusType>('checking');
  
  // Generator states
  const [genLength, setGenLength] = useState<number>(16);
  const [genCount, setGenCount] = useState<number>(5);
  const [includeUpper, setIncludeUpper] = useState<boolean>(true);
  const [includeLower, setIncludeLower] = useState<boolean>(true);
  const [includeDigits, setIncludeDigits] = useState<boolean>(true);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState<boolean>(false);
  const [generatedPasswords, setGeneratedPasswords] = useState<GeneratedPassword[]>([]);
  
  // Passphrase states
  const [numWords, setNumWords] = useState<number>(4);
  const [separator, setSeparator] = useState<string>('-');
  const [phraseCount, setPhraseCount] = useState<number>(5);
  const [generatedPhrases, setGeneratedPhrases] = useState<GeneratedPassword[]>([]);

  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data: HealthStatus = await response.json();
      
      if (data.models_loaded) {
        setApiStatus('healthy');
        setAvailableModels(data.available_models || []);
      } else {
        setApiStatus('no-models');
      }
    } catch (error) {
      setApiStatus('offline');
    }
  };

  const analyzePassword = async (): Promise<void> => {
    if (!password) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error analyzing password:', error);
      alert('Failed to analyze password. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  };

  const generatePasswords = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          length: genLength,
          count: genCount,
          include_uppercase: includeUpper,
          include_lowercase: includeLower,
          include_digits: includeDigits,
          include_symbols: includeSymbols,
          exclude_ambiguous: excludeAmbiguous
        })
      });
      
      const data = await response.json();
      setGeneratedPasswords(data.passwords.map((pwd: string, i: number) => ({
        password: pwd,
        metadata: data.metadata[i]
      })));
    } catch (error) {
      console.error('Error generating passwords:', error);
      alert('Failed to generate passwords.');
    } finally {
      setLoading(false);
    }
  };

  const generatePassphrases = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/generate/passphrase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_words: numWords,
          separator: separator,
          count: phraseCount
        })
      });
      
      const data = await response.json();
      setGeneratedPhrases(data.passwords.map((pwd: string, i: number) => ({
        password: pwd,
        metadata: data.metadata[i]
      })));
    } catch (error) {
      console.error('Error generating passphrases:', error);
      alert('Failed to generate passphrases.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStrengthColor = (strength: string): string => {
    switch (strength?.toLowerCase()) {
      case 'strong': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'weak': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStrengthIcon = (strength: string) => {
    switch (strength.toLowerCase()) {
      case 'strong': return <CheckCircle className="w-5 h-5" />;
      case 'medium': return <AlertTriangle className="w-5 h-5" />;
      case 'weak': return <XCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getFilteredPredictions = (): Record<string, string> => {
    if (!result?.predictions) return {};
    if (selectedModel === 'all') return result.predictions;
    return { [selectedModel]: result.predictions[selectedModel] };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Password Analyzer
                </h1>
                <p className="text-gray-600 text-sm">5 ML Models • 684K+ Breach Database</p>
              </div>
            </div>
            
            {/* API Status */}
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              apiStatus === 'healthy' ? 'bg-green-100 text-green-700' :
              apiStatus === 'no-models' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {apiStatus === 'healthy' ? '✅ API Connected' :
               apiStatus === 'no-models' ? '⚠️ No Models' :
               '❌ API Offline'}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {[
              { id: 'analyze' as TabType, label: 'Analyze', icon: Brain },
              { id: 'generate' as TabType, label: 'Generate', icon: Key },
              { id: 'passphrase' as TabType, label: 'Passphrase', icon: Zap }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Password to Analyze
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && analyzePassword()}
                      placeholder="Type your password here..."
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Model for Prediction
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Models (Consensus)</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={analyzePassword}
                  disabled={!password || loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing...' : 'Analyze Password'}
                </button>
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-6">
                {/* Breach Warning */}
                {result.is_breached && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-bold text-red-900 text-lg">CRITICAL: Password Compromised!</h3>
                        <p className="text-red-700 mt-1">
                          This password was found in <span className="font-bold">{result.breach_count.toLocaleString()}</span> data breaches.
                          Never use this password!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Model Predictions */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Brain className="w-6 h-6 text-blue-600" />
                    Model Predictions
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {Object.entries(getFilteredPredictions()).map(([model, prediction]) => (
                      <div key={model} className={`p-4 rounded-xl border-2 ${getStrengthColor(prediction)}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{model}</span>
                          <div className="flex items-center gap-2">
                            {getStrengthIcon(prediction)}
                            <span className="font-bold">{prediction}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedModel === 'all' && (
                    <div className={`p-6 rounded-xl border-2 ${getStrengthColor(result.consensus)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-lg">Consensus Prediction</h4>
                          <p className="text-sm opacity-75">{result.agreement_percentage.toFixed(0)}% agreement</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStrengthIcon(result.consensus)}
                          <span className="text-2xl font-bold">{result.consensus}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Metrics
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Length:</span>
                        <span className="font-bold">{result.length} characters</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shannon Entropy:</span>
                        <span className="font-bold">{result.metrics.shannon_entropy.toFixed(2)} bits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Practical Entropy:</span>
                        <span className="font-bold">{result.metrics.practical_entropy.toFixed(2)} bits</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-600" />
                      Composition
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lowercase:</span>
                        <span className="font-bold">{result.composition.lowercase}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Uppercase:</span>
                        <span className="font-bold">{result.composition.uppercase}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Digits:</span>
                        <span className="font-bold">{result.composition.digits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Symbols:</span>
                        <span className="font-bold">{result.composition.symbols}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unique:</span>
                        <span className="font-bold">{result.composition.unique}/{result.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Crack Time */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    Time to Crack
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(result.crack_time).map(([method, time]) => (
                      <div key={method} className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-600 mb-1 uppercase">{method.replace('_', ' ')}</p>
                        <p className="font-bold text-sm">{time}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Patterns & Dictionary Words */}
                {(result.patterns.length > 0 || result.dictionary_words.length > 0) && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Security Issues
                    </h3>
                    <div className="space-y-2">
                      {result.patterns.map((pattern, i) => (
                        <div key={i} className="p-3 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                          {pattern}
                        </div>
                      ))}
                      {result.dictionary_words.length > 0 && (
                        <div className="p-3 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                          Dictionary words found: {result.dictionary_words.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {result.suggestions.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Recommendations
                    </h3>
                    <div className="space-y-2">
                      {result.suggestions.map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
                          <span>•</span>
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-bold mb-6">Password Generator Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Length: {genLength}
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={genLength}
                    onChange={(e) => setGenLength(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Count: {genCount}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Uppercase (A-Z)', state: includeUpper, setter: setIncludeUpper },
                  { label: 'Lowercase (a-z)', state: includeLower, setter: setIncludeLower },
                  { label: 'Digits (0-9)', state: includeDigits, setter: setIncludeDigits },
                  { label: 'Symbols (!@#$)', state: includeSymbols, setter: setIncludeSymbols },
                  { label: 'Exclude Ambiguous', state: excludeAmbiguous, setter: setExcludeAmbiguous }
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={generatePasswords}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Passwords'}
              </button>
            </div>

            {generatedPasswords.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-xl font-bold mb-6">Generated Passwords</h3>
                <div className="space-y-3">
                  {generatedPasswords.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <span className="flex-1 font-mono font-medium">{item.password}</span>
                      <span className="text-sm text-gray-600">
                        {item.metadata.entropy.toFixed(1)} bits
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.metadata.crack_time_gpu}
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.password)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <Copy className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Passphrase Tab */}
        {activeTab === 'passphrase' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-bold mb-6">Passphrase Generator Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Words: {numWords}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={numWords}
                    onChange={(e) => setNumWords(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Separator
                  </label>
                  <select
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  >
                    <option value="-">Dash (-)</option>
                    <option value="_">Underscore (_)</option>
                    <option value=" ">Space ( )</option>
                    <option value=".">Dot (.)</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Count: {phraseCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={phraseCount}
                  onChange={(e) => setPhraseCount(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={generatePassphrases}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Passphrases'}
              </button>
            </div>

            {generatedPhrases.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-xl font-bold mb-6">Generated Passphrases</h3>
                <div className="space-y-3">
                  {generatedPhrases.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <span className="flex-1 font-medium">{item.password}</span>
                      <span className="text-sm text-gray-600">
                        {item.metadata.entropy.toFixed(1)} bits
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.metadata.crack_time_gpu}
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.password)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <Copy className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;