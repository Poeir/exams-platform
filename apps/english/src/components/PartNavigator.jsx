import React from 'react';
import { useExam } from '../state/ExamContext.jsx';

export default function PartNavigator({ part }) {
  const { exam, position, setPosition, answers, flagged } = useExam();
  const { groups } = part;

  // Exam-wide starting question number for this part.
  let examOffset = 0;
  for (const p of (exam?.parts || [])) {
    if (p.number === part.number) break;
    examOffset += p.totalItems;
  }

  // Build a flat list of all items in this part with their group index.
  const tiles = [];
  let counter = 1;
  groups.forEach((g, gi) => {
    g.items.forEach((it) => {
      tiles.push({
        id: it.id,
        number: examOffset + counter,
        groupIndex: gi,
        answered: !!answers[it.id],
        flagged: flagged.has(it.id),
      });
      counter += 1;
    });
  });

  return (
    <div className="et-qnav">
      {tiles.map((t) => {
        const cls = ['et-qnav__btn'];
        if (t.answered) cls.push('et-qnav__btn--answered');
        if (t.groupIndex === position.groupIndex) cls.push('et-qnav__btn--current');
        if (t.flagged) cls.push('et-qnav__btn--flagged');
        return (
          <button
            key={t.id}
            type="button"
            className={cls.join(' ')}
            onClick={(e) => {
              e.stopPropagation();
              setPosition({ partNumber: part.number, groupIndex: t.groupIndex });
            }}
          >
            {t.number}
          </button>
        );
      })}
    </div>
  );
}
