import { SCENARIOS } from '../data.js';
import { buildPath } from './quizPath.js';

export const AXES = {
  EI: ['E', 'I'],
  SN: ['S', 'N'],
  TF: ['T', 'F'],
  JP: ['J', 'P'],
};

export const CONFIDENCE_LABELS = {
  midzone: {
    th: 'ใกล้กลาง',
    short: 'ใกล้กลาง',
    hint: 'ผลของแกนนี้ยังไม่เอนไปฝั่งใดฝั่งหนึ่งชัดเจน อาจปรับใช้ได้ทั้งสองแบบตามสถานการณ์',
  },
  slight: {
    th: 'เอนเล็กน้อย',
    short: 'เอนเล็กน้อย',
    hint: 'มีแนวโน้มไปทางฝั่งนี้เล็กน้อย แต่ยังอาจใช้พฤติกรรมอีกฝั่งได้บ่อยตามบริบท',
  },
  clear: {
    th: 'ค่อนข้างชัด',
    short: 'ค่อนข้างชัด',
    hint: 'มีรูปแบบการตอบที่เอนไปทางฝั่งนี้ค่อนข้างสม่ำเสมอ',
  },
  veryClear: {
    th: 'ชัดมาก',
    short: 'ชัดมาก',
    hint: 'มีรูปแบบการตอบที่เอนไปทางฝั่งนี้อย่างสม่ำเสมอมากในสถานการณ์ที่ประเมิน',
  },
};

export const CONFIDENCE_DESCRIPTIONS = {
  midzone:
    'ผลของคุณอยู่ใกล้กึ่งกลาง จึงอาจใช้ได้ทั้งสองแบบตามสถานการณ์ ไม่ใช่จุดอ่อนหรือความไม่ชัดเจนของตัวตน',
  slight:
    'ผลของคุณเอนไปทางฝั่งนี้เล็กน้อย แต่ยังมีความยืดหยุ่น และอาจใช้พฤติกรรมอีกฝั่งได้ตามบริบท',
  clear:
    'ผลของคุณเอนไปทางฝั่งนี้ค่อนข้างชัด และมักเป็นแนวทางหลักที่ใช้ในสถานการณ์ลักษณะนี้',
  veryClear:
    'ผลของคุณเอนไปทางฝั่งนี้ชัดมาก และมีรูปแบบการตอบที่ค่อนข้างสม่ำเสมอในสถานการณ์ที่ประเมิน',
};
export const AXIS_POLES = {
  EI: {
    E: {
      th: 'คิดผ่านการพูดคุย',
      hint: 'มักได้พลังจากการแลกเปลี่ยนกับคนอื่น และมักคิดต่อยอดได้ดีเมื่อได้คุยหรือแชร์ออกมา',
    },
    I: {
      th: 'คิดก่อนแล้วค่อยสื่อสาร',
      hint: 'มักได้พลังจากเวลาส่วนตัว และชอบประมวลผลให้ชัดก่อนค่อยพูดหรือแชร์กับคนอื่น',
    },
  },
  SN: {
    S: {
      th: 'เน้นข้อมูลจริงและรายละเอียด',
      hint: 'มักใช้ข้อมูลที่จับต้องได้ ตัวอย่างจริง รายละเอียด และประสบการณ์ที่เคยเกิดขึ้นเป็นฐานในการทำงาน',
    },
    N: {
      th: 'มองภาพรวมและความเป็นไปได้',
      hint: 'มักมองภาพใหญ่ จับความเชื่อมโยง เห็น pattern และคิดถึงโอกาสหรือแนวทางใหม่ที่ยังไม่เกิดขึ้น',
    },
  },
  TF: {
    T: {
      th: 'ตัดสินใจด้วยเหตุผลและหลักฐาน',
      hint: 'มักชั่งน้ำหนักจากข้อมูล เหตุผล ความเป็นธรรม ประสิทธิภาพ และผลลัพธ์ที่ตรวจสอบได้',
    },
    F: {
      th: 'ตัดสินใจโดยคำนึงถึงผู้คน',
      hint: 'มักชั่งน้ำหนักจากผลกระทบต่อคน ความสัมพันธ์ ความร่วมมือ คุณค่าร่วม และบรรยากาศของทีม',
    },
  },
  JP: {
    J: {
      th: 'ชอบแผนชัดและปิดงานให้เรียบร้อย',
      hint: 'มักสบายใจเมื่อมีเป้าหมาย ขอบเขต เวลา เจ้าของงาน และขั้นตอนถัดไปที่ชัดเจน',
    },
    P: {
      th: 'ชอบยืดหยุ่นและเปิดทางเลือก',
      hint: 'มักสบายใจเมื่อยังมีพื้นที่ให้ปรับเปลี่ยน ทดลอง รับข้อมูลใหม่ และเลือกทางที่เหมาะกับสถานการณ์จริง',
    },
  },
};
export const AXIS_LABELS_TH = {
  EI: {
    E: 'คิดผ่านการพูดคุย',
    I: 'คิดก่อนแล้วค่อยสื่อสาร',
  },
  SN: {
    S: 'เน้นข้อมูลจริงและรายละเอียดลึก',
    N: 'มองภาพรวมและความเป็นไปได้',
  },
  TF: {
    T: 'ตัดสินใจด้วยเหตุผลและหลักฐาน',
    F: 'ตัดสินใจโดยคำนึงถึงความรู้สึกคน',
  },
  JP: {
    J: 'ชอบแผนชัดและปิดงานให้เรียบร้อย',
    P: 'ชอบยืดหยุ่นและเปิดทางเลือก',
  },
};

export const FACET_LABELS = {
  initiating: 'เริ่มบทสนทนาหรือเปิดประเด็นก่อน',
  collaborative: 'ชอบทำงานและแลกเปลี่ยนกับคนอื่น',
  reflective: 'คิดทบทวนก่อนพูดหรือก่อนตัดสินใจ',
  deepFocus: 'โฟกัสลึกและจดจ่อกับงานทีละเรื่อง',

  concrete: 'มองหาข้อมูลจริง ตัวอย่าง และรายละเอียด',
  practical: 'เลือกวิธีที่ใช้ได้จริงในสถานการณ์นั้น',
  bigPicture: 'มองภาพรวม เป้าหมาย และทิศทาง',
  possibility: 'เห็นทางเลือกใหม่และความเป็นไปได้',

  logical: 'ใช้เหตุผล ข้อมูล และหลักฐานประกอบการตัดสินใจ',
  directProblemSolving: 'แก้ปัญหาแบบตรงจุดและไม่อ้อมค้อม',
  empathetic: 'คำนึงถึงความรู้สึกและผลกระทบต่อคน',
  harmony: 'รักษาบรรยากาศและความร่วมมือของทีม',

  planful: 'วางแผน จัดลำดับ และกำหนดขั้นตอนชัดเจน',
  closure: 'ต้องการข้อสรุปและการปิดงานให้เรียบร้อย',
  flexible: 'ปรับตัวตามสถานการณ์และข้อมูลใหม่',
  exploratory: 'ทดลองวิธีใหม่และเปิดรับทางเลือกหลายแบบ',
};

function getConfidence(dominantPercent) {
  if (dominantPercent < 55) return 'midzone';
  if (dominantPercent < 65) return 'slight';
  if (dominantPercent < 80) return 'clear';
  return 'veryClear';
}

function addTraitScores(target, weights, qWeight, multiplier) {
  if (!weights) return;
  for (const [trait, value] of Object.entries(weights)) {
    target[trait] = (target[trait] || 0) + value * qWeight * multiplier;
  }
}

function addFacetScores(target, facets, qWeight, multiplier) {
  if (!facets) return;
  for (const [name, value] of Object.entries(facets)) {
    target[name] = (target[name] || 0) + value * qWeight * multiplier;
  }
}

function getAxisResult(scores, leftLetter, rightLetter) {
  const left = scores[leftLetter] || 0;
  const right = scores[rightLetter] || 0;
  const total = left + right;

  if (!total) {
    return {
      winner: leftLetter,
      leftPercent: 50,
      rightPercent: 50,
      dominantPercent: 50,
      confidence: 'midzone',
      isMidzone: true,
    };
  }

  const leftPercent = Math.round((left / total) * 100);
  const rightPercent = 100 - leftPercent;
  const winner = leftPercent >= rightPercent ? leftLetter : rightLetter;
  const dominantPercent = Math.max(leftPercent, rightPercent);
  const confidence = getConfidence(dominantPercent);

  return {
    winner,
    leftPercent,
    rightPercent,
    dominantPercent,
    confidence,
    isMidzone: confidence === 'midzone',
  };
}

export function scoreAnswers(answers = {}) {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const facets = {};
  const byId = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));

  for (const [qid, ans] of Object.entries(answers || {})) {
    if (!ans) continue;
    const scenario = byId[qid];
    const qWeight = scenario?.assessment?.discrimination ?? 1;

    if (ans.distribution) {
      const dist = ans.distribution;
      const opts = ans.options || scenario?.actions || [];
      for (const opt of opts) {
        const points = dist[opt.id] || 0;
        const multiplier = (points / 100) * 2;
        addTraitScores(scores, opt.w, qWeight, multiplier);
        addFacetScores(facets, opt.facets, qWeight, multiplier);
      }
    } else if (ans.w) {
      addTraitScores(scores, ans.w, qWeight, 1);
      const opt = scenario?.options?.find(o => o.id === ans.optionId);
      addFacetScores(facets, opt?.facets, qWeight, 1);
    }
  }

  const axes = {
    EI: getAxisResult(scores, 'E', 'I'),
    SN: getAxisResult(scores, 'S', 'N'),
    TF: getAxisResult(scores, 'T', 'F'),
    JP: getAxisResult(scores, 'J', 'P'),
  };

  const code = axes.EI.winner + axes.SN.winner + axes.TF.winner + axes.JP.winner;
  const softCode = [
    axes.EI.isMidzone ? 'E/I' : axes.EI.winner,
    axes.SN.isMidzone ? 'S/N' : axes.SN.winner,
    axes.TF.isMidzone ? 'T/F' : axes.TF.winner,
    axes.JP.isMidzone ? 'J/P' : axes.JP.winner,
  ].join(' · ');

  const midzones = Object.entries(axes)
    .filter(([, result]) => result.isMidzone)
    .map(([axis]) => axis);

  return {
    code,
    softCode,
    axes,
    bars: {
      EI: axes.EI.leftPercent,
      SN: axes.SN.leftPercent,
      TF: axes.TF.leftPercent,
      JP: axes.JP.leftPercent,
      ES: axes.EI.leftPercent,
    },
    confidence: {
      EI: axes.EI.confidence,
      SN: axes.SN.confidence,
      TF: axes.TF.confidence,
      JP: axes.JP.confidence,
    },
    midzones,
    rawScores: scores,
    facets,
  };
}

export function scoreResponses(responses = {}) {
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
    throw new Error('Assessment responses must be an object.');
  }

  const byId = Object.fromEntries(SCENARIOS.map((scenario) => [scenario.id, scenario]));
  const answers = {};

  for (const [questionId, response] of Object.entries(responses)) {
    const scenario = byId[questionId];
    if (!scenario) throw new Error(`Unknown question response: ${questionId}.`);

    if (typeof response === 'string') {
      const option = scenario.options?.find((item) => item.id === response);
      if (!option) throw new Error(`Invalid option response for ${questionId}.`);
      answers[questionId] = { optionId: option.id, w: option.w, next: option.next };
      continue;
    }

    if (!response?.distribution || !scenario.actions) {
      throw new Error(`Invalid response shape for ${questionId}.`);
    }

    const distribution = {};
    let total = 0;
    for (const action of scenario.actions) {
      const points = response.distribution[action.id];
      if (!Number.isInteger(points) || points < 0 || points > 100) {
        throw new Error(`Invalid slider response for ${questionId}.`);
      }
      distribution[action.id] = points;
      total += points;
    }
    if (total !== 100) throw new Error(`Slider response for ${questionId} must total 100.`);

    answers[questionId] = { distribution, options: scenario.actions };
  }

  const expectedPath = buildPath(answers);
  if (expectedPath.some((question) => !answers[question.id])) {
    throw new Error('Assessment responses are incomplete.');
  }

  return scoreAnswers(answers);
}

export function overrideScoreCode(score, code) {
  if (!/^[EI][SN][TF][JP]$/.test(code)) return score;

  const makeAxis = (axisKey, leftLetter, rightLetter, winner) => {
    const leftWins = winner === leftLetter;
    return {
      winner,
      leftPercent: leftWins ? 82 : 18,
      rightPercent: leftWins ? 18 : 82,
      dominantPercent: 82,
      confidence: 'veryClear',
      isMidzone: false,
    };
  };

  const axes = {
    EI: makeAxis('EI', 'E', 'I', code[0]),
    SN: makeAxis('SN', 'S', 'N', code[1]),
    TF: makeAxis('TF', 'T', 'F', code[2]),
    JP: makeAxis('JP', 'J', 'P', code[3]),
  };

  return {
    ...score,
    code,
    softCode: code.split('').join(' / '),
    axes,
    bars: {
      ...score.bars,
      EI: axes.EI.leftPercent,
      SN: axes.SN.leftPercent,
      TF: axes.TF.leftPercent,
      JP: axes.JP.leftPercent,
      ES: axes.EI.leftPercent,
    },
    confidence: {
      EI: axes.EI.confidence,
      SN: axes.SN.confidence,
      TF: axes.TF.confidence,
      JP: axes.JP.confidence,
    },
    midzones: [],
    rawScores: {
      ...score.rawScores,
      E: code[0] === 'E' ? 82 : 18,
      I: code[0] === 'I' ? 82 : 18,
      S: code[1] === 'S' ? 82 : 18,
      N: code[1] === 'N' ? 82 : 18,
      T: code[2] === 'T' ? 82 : 18,
      F: code[2] === 'F' ? 82 : 18,
      J: code[3] === 'J' ? 82 : 18,
      P: code[3] === 'P' ? 82 : 18,
    },
  };
}
