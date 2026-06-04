import { useState, useEffect } from 'react';
import { Icon, Loading } from './components.jsx';
import { Landing, Purpose } from './screens/Landing.jsx';
import { Quiz } from './screens/Quiz.jsx';
import { Result } from './screens/Result.jsx';
import { withBase } from './lib/base.js';
import { RESULT_TYPE_CODES } from './lib/resultCatalog.js';
import { buildExportPayload, emitResult, setResultTransport } from './lib/resultExport.js';
import { notifyParentCompleted } from './lib/parentSignal.js';
import {
  completeServiceAttempt,
  createServiceAttempt,
  getServiceResult,
  getServiceResultByViewToken,
  getServiceResultsForUser,
} from './lib/assessmentApi.js';
import {
  MOCK_USERS,
  completeMockAttempt,
  createMockAttempt,
  getMockResult,
  getMockResultsForUser,
} from './lib/mockParentApi.js';

const DEV_SCREENS = ['landing', 'purpose', 'quiz', 'loading-result', 'result'];

const RESULT_LOADING_DELAY = 900;
const INTEGRATION_MODES = {
  mock: 'browser-mock',
  service: 'service-api',
};

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [answers, setAnswers] = useState({});
  const [resultCodeOverride, setResultCodeOverride] = useState('');
  const [resultRecord, setResultRecord] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [submissionError, setSubmissionError] = useState('');
  const [mockUserId, setMockUserId] = useState(MOCK_USERS[0].id);
  const [mockResults, setMockResults] = useState([]);
  const [integrationMode, setIntegrationMode] = useState(INTEGRATION_MODES.mock);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  useEffect(() => {
    if (!activeAttempt) return undefined;
    if (activeAttempt.transport === INTEGRATION_MODES.service) {
      return setResultTransport((payload) => completeServiceAttempt(activeAttempt, payload));
    }
    if (!import.meta.env.DEV) return undefined;
    return setResultTransport((payload) => completeMockAttempt(activeAttempt.attemptToken, payload));
  }, [activeAttempt]);

  useEffect(() => {
    const loadContextFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);

      // Parent-site "view result in a new tab": a short-lived signed token
      // issued to the parent backend opens the result screen read-only.
      const viewToken = params.get('view_token');
      if (viewToken) {
        try {
          const viewedResult = await getServiceResultByViewToken(viewToken);
          setResultRecord(viewedResult);
          setScreen('result');
        } catch (error) {
          setSubmissionError(error.message);
        }
        return;
      }

      const attemptId = params.get('attempt_id');
      const attemptToken = params.get('attempt_token');
      if (attemptId && attemptToken) {
        window.sessionStorage.setItem(getAttemptTokenKey(attemptId), attemptToken);
        params.delete('attempt_token');
        replaceQuery(params);
        setActiveAttempt({
          id: attemptId,
          attemptToken,
          transport: INTEGRATION_MODES.service,
        });
        setScreen('purpose');
        return;
      }

      const resultId = params.get('result_id');
      const storedAttemptToken = attemptId
        ? window.sessionStorage.getItem(getAttemptTokenKey(attemptId))
        : null;
      if (resultId && storedAttemptToken) {
        try {
          const storedResult = await getServiceResult(resultId, storedAttemptToken);
          setResultRecord(storedResult);
          setScreen('result');
        } catch (error) {
          setSubmissionError(error.message);
        }
        return;
      }
      if (attemptId && storedAttemptToken) {
        setActiveAttempt({
          id: attemptId,
          attemptToken: storedAttemptToken,
          transport: INTEGRATION_MODES.service,
        });
        setScreen('purpose');
        return;
      }

      if (!import.meta.env.DEV) return;
      const mockResultId = new URLSearchParams(window.location.search).get('mock_result');
      if (!mockResultId) return;

      const storedResult = getMockResult(mockResultId);
      if (!storedResult) return;

      setResultRecord(storedResult);
      setMockUserId(storedResult.userId);
      setScreen('result');
    };

    loadContextFromUrl();
    window.addEventListener('popstate', loadContextFromUrl);
    return () => window.removeEventListener('popstate', loadContextFromUrl);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;

    const loadResults = async () => {
      try {
        const results = integrationMode === INTEGRATION_MODES.service
          ? await getServiceResultsForUser(mockUserId)
          : getMockResultsForUser(mockUserId);
        if (active) setMockResults(results);
      } catch (error) {
        if (active) {
          setMockResults([]);
          setSubmissionError(error.message);
        }
      }
    };

    loadResults();
    return () => {
      active = false;
    };
  }, [integrationMode, mockUserId, resultRecord]);

  const restart = () => {
    setAnswers({});
    setResultRecord(null);
    setActiveAttempt(null);
    setSubmissionError('');
    setResultCodeOverride('');
    setScreen('landing');
    updateResultUrl(null, null, null);
  };

  const jumpToScreen = (nextScreen) => {
    setScreen(nextScreen);
  };

  const startMockAssessment = async () => {
    const user = MOCK_USERS.find((item) => item.id === mockUserId);
    try {
      const attempt = integrationMode === INTEGRATION_MODES.service
        ? await createServiceAttempt(user)
        : createMockAttempt(mockUserId);
      setAnswers({});
      setResultRecord(null);
      setActiveAttempt({
        ...attempt,
        transport: integrationMode,
      });
      setSubmissionError('');
      setResultCodeOverride('');
      setScreen('purpose');
      if (integrationMode === INTEGRATION_MODES.service) {
        window.sessionStorage.setItem(getAttemptTokenKey(attempt.id), attempt.attemptToken);
      }
      updateResultUrl(null, null, integrationMode === INTEGRATION_MODES.service ? attempt.id : null);
    } catch (error) {
      setSubmissionError(error.message);
    }
  };

  const openMockResult = (result) => {
    setAnswers({});
    setActiveAttempt(null);
    setSubmissionError('');
    setResultRecord(result);
    setScreen('result');
    updateResultUrl(result.source === INTEGRATION_MODES.service ? result.id : null, result.source !== INTEGRATION_MODES.service ? result.id : null);
  };

  const completeAssessment = async () => {
    setSubmissionError('');
    setScreen('loading-result');

    const payload = buildExportPayload(answers, {
      attemptId: activeAttempt?.id,
      userId: activeAttempt?.userId,
      resultCodeOverride,
    });

    try {
      const [transportResult] = await Promise.all([
        Promise.resolve(emitResult(payload)),
        wait(RESULT_LOADING_DELAY),
      ]);

      setResultRecord(transportResult || null);
      // When embedded in a parent iframe (empeo), relay the server-scored result
      // back via postMessage so the parent can persist its own copy — see
      // lib/parentSignal.js. No-op outside an iframe / for the mock transport.
      notifyParentCompleted(payload.attemptId, transportResult ?? null);
      setActiveAttempt(null);
      if (transportResult?.id) {
        updateResultUrl(
          transportResult.source === INTEGRATION_MODES.service ? transportResult.id : null,
          transportResult.source !== INTEGRATION_MODES.service ? transportResult.id : null,
          payload.attemptId,
        );
      }
      setScreen('result');
    } catch (error) {
      setSubmissionError(error.message || 'Unable to save assessment result.');
      setScreen('quiz');
    }
  };

  return (
    <div className="app-shell">
      <TopNav screen={screen} onHome={restart} />
      {submissionError && (
        <div className="integration-error" role="alert">
          {submissionError}
        </div>
      )}
      {screen === 'landing' && (
        <Landing onStart={() => setScreen('purpose')} />
      )}
      {screen === 'purpose' && (
        <Purpose
          onContinue={() => setScreen('quiz')}
          onBack={() => setScreen('landing')}
        />
      )}
      {screen === 'quiz' && (
        <Quiz
          answers={answers}
          setAnswers={setAnswers}
          onComplete={completeAssessment}
          onBack={() => setScreen('purpose')}
        />
      )}
      {screen === 'loading-result' && (
        <Loading
          title="กำลังวิเคราะห์บุคลิกของคุณ"
          subtitle="กำลังประมวลผลคำตอบทั้งหมดเพื่อหาบุคลิกที่ใกล้เคียงคุณที่สุด"
          mascot="lightbulb"
        />
      )}
      {screen === 'result' && (
        <Result
          answers={answers}
          resultRecord={resultRecord}
          user={resultRecord?.user}
          resultCodeOverride={resultCodeOverride}
          onRestart={restart}
        />
      )}
      {import.meta.env.DEV && (
        <DevPanel
          screen={screen}
          onScreenChange={jumpToScreen}
          resultCodeOverride={resultCodeOverride}
          onResultCodeChange={setResultCodeOverride}
          integrationMode={integrationMode}
          onIntegrationModeChange={setIntegrationMode}
          mockUserId={mockUserId}
          onMockUserChange={setMockUserId}
          onStartMockAssessment={startMockAssessment}
          activeAttempt={activeAttempt}
          mockResults={mockResults}
          onOpenMockResult={openMockResult}
        />
      )}
    </div>
  );
}

function DevPanel({
  screen,
  onScreenChange,
  resultCodeOverride,
  onResultCodeChange,
  integrationMode,
  onIntegrationModeChange,
  mockUserId,
  onMockUserChange,
  onStartMockAssessment,
  activeAttempt,
  mockResults,
  onOpenMockResult,
}) {
  return (
    <aside className="dev-panel" aria-label="Dev tools">
      <div className="dev-panel-head">
        <Icon name="bolt" size={14} />
        <span>Dev tweak</span>
      </div>
      <label className="dev-panel-field">
        <span>Screen</span>
        <select value={screen} onChange={(event) => onScreenChange(event.target.value)}>
          {DEV_SCREENS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="dev-panel-field">
        <span>Result type</span>
        <select value={resultCodeOverride} onChange={(event) => onResultCodeChange(event.target.value)}>
          <option value="">Auto score</option>
          {RESULT_TYPE_CODES.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </label>
      <div className="dev-panel-divider">Integration sandbox</div>
      <label className="dev-panel-field">
        <span>Persistence</span>
        <select value={integrationMode} onChange={(event) => onIntegrationModeChange(event.target.value)}>
          <option value={INTEGRATION_MODES.mock}>Browser mock</option>
          <option value={INTEGRATION_MODES.service}>Azure SQL service</option>
        </select>
      </label>
      <label className="dev-panel-field">
        <span>Signed-in user</span>
        <select value={mockUserId} onChange={(event) => onMockUserChange(event.target.value)}>
          {MOCK_USERS.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </label>
      <button className="dev-panel-button" onClick={onStartMockAssessment}>
        Start integrated test
      </button>
      {activeAttempt && (
        <div className="dev-panel-attempt">
          Attempt active for {activeAttempt.userId}
        </div>
      )}
      <div className="dev-panel-results">
        <span>Stored results</span>
        {mockResults.length === 0 && <small>No completed results</small>}
        {mockResults.slice(0, 3).map((result) => (
          <button key={result.id} onClick={() => onOpenMockResult(result)}>
            {result.result.code} · {formatResultTime(result.completedAt)}
          </button>
        ))}
      </div>
    </aside>
  );
}

function wait(delay) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delay);
  });
}

function updateResultUrl(resultId, mockResultId, attemptId) {
  const url = new URL(window.location.href);
  if (resultId) url.searchParams.set('result_id', resultId);
  else url.searchParams.delete('result_id');
  if (mockResultId && import.meta.env.DEV) url.searchParams.set('mock_result', mockResultId);
  else url.searchParams.delete('mock_result');
  if (attemptId) url.searchParams.set('attempt_id', attemptId);
  else url.searchParams.delete('attempt_id');
  window.history.replaceState({}, '', url.toString());
}

function getAttemptTokenKey(attemptId) {
  return `mbti.attempt-token.${attemptId}`;
}

function replaceQuery(params) {
  const url = new URL(window.location.href);
  url.search = params.toString();
  window.history.replaceState({}, '', url.toString());
}

function formatResultTime(date) {
  return new Date(date).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TopNav({ screen, onHome }) {
  return (
    <header className="appnav">
      <div className="appnav-inner">
        <button
          className="appnav-logo"
          onClick={onHome}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src={withBase('/logo.png')} alt="empeo" className="appnav-logo-mark" />
          <span className="appnav-logo-pipe">|</span>
          <span>Work Persona</span>
        </button>
        <div className="appnav-spacer"></div>
      </div>
    </header>
  );
}
