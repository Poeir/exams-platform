import React from 'react';
import ExamSection from '../components/ExamSection.jsx';

export default function Listening({ onFlowNext, onFlowPrev, onExit }) {
  return <ExamSection section="listening" onFlowNext={onFlowNext} onFlowPrev={onFlowPrev} onExit={onExit} />;
}
