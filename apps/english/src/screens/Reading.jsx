import React from 'react';
import ExamSection from '../components/ExamSection.jsx';

export default function Reading({ onFlowNext, onFlowPrev, onExit }) {
  return <ExamSection section="reading" onFlowNext={onFlowNext} onFlowPrev={onFlowPrev} onExit={onExit} />;
}
