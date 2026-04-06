'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ASSESSMENT_QUESTIONS, LIKERT_OPTIONS, STRENGTH_DOMAINS } from '../lib/strengths-data';
import {
  calculateStrengths,
  saveResults,
  saveAnswers,
  loadAnswers,
  type AssessmentAnswers,
} from '../lib/strengths-scoring';

export default function KesfetPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Load saved answers on mount
  useEffect(() => {
    const saved = loadAnswers();
    if (saved && Object.keys(saved).length > 0) {
      setAnswers(saved);
      // Find first unanswered question
      const firstUnanswered = ASSESSMENT_QUESTIONS.findIndex((q) => saved[q.id] === undefined);
      if (firstUnanswered >= 0) {
        setCurrentQuestion(firstUnanswered);
      }
      setShowIntro(false);
    }
  }, []);

  // Save answers whenever they change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      saveAnswers(answers);
    }
  }, [answers]);

  const question = ASSESSMENT_QUESTIONS[currentQuestion];
  const domain = question ? STRENGTH_DOMAINS.find((d) => d.id === question.domainId) : null;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = ASSESSMENT_QUESTIONS.length;
  const progressPct = (answeredCount / totalQuestions) * 100;
  const allAnswered = answeredCount === totalQuestions;

  const handleAnswer = useCallback(
    (value: number) => {
      if (!question) return;
      const updated = { ...answers, [question.id]: value };
      setAnswers(updated);

      // Auto-advance to next question after a short delay
      setTimeout(() => {
        if (currentQuestion < totalQuestions - 1) {
          setCurrentQuestion((prev) => prev + 1);
        }
      }, 300);
    },
    [answers, currentQuestion, question, totalQuestions]
  );

  const handleSubmit = useCallback(async () => {
    if (!allAnswered) return;
    setIsSubmitting(true);

    const results = calculateStrengths(answers);
    saveResults(results);

    // POST to API for DB persistence
    try {
      const domainScores: Record<string, number> = {};
      for (const d of results.domains) {
        domainScores[d.domainId] = d.score;
      }
      await fetch('/api/strengths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: '5e7f34b4-2906-4a2b-96f4-a7e689b6e33e', // current user
          answers,
          domainScores,
          top5: results.top5.map((d) => d.domainId),
          shadow: results.shadow.map((d) => d.domainId),
          weaknesses: results.weaknesses.map((d) => d.domainId),
          roleFitScore: results.roleFitScore,
        }),
      });
    } catch {
      // API save failed, results still in localStorage
    }

    router.push('/guclu-yonler/sonuclar');
  }, [allAnswered, answers, router]);

  if (showIntro) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif' }} className="flex flex-col items-center gap-8 py-8">
        <div
          style={{
            maxWidth: 600,
            width: '100%',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #f0f0f0',
            padding: 40,
            textAlign: 'center',
          }}
        >
          {/* Star icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#f0f0ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg className="h-8 w-8 text-[#5E5CE6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 8 }}>
            Güçlü Yön Keşfi
          </h1>
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>
            UpStrengths-TR ile kişisel güçlü yönlerinizi keşfedin
          </p>
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 32 }}>
            Bu değerlendirme 24 sorudan oluşur ve yaklaşık 5 dakika sürer.
            VIA karakter güçleri taksonomisi temelinde, 8 farklı güçlü yön alanını ölçer.
            Yanıtlarınız tamamen gizli tutulur.
          </p>

          {/* Domain Preview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginBottom: 32,
            }}
          >
            {STRENGTH_DOMAINS.map((domain) => (
              <div
                key={domain.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: domain.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>
                  {domain.name_tr}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowIntro(false)}
            style={{
              width: '100%',
              height: 48,
              background: '#5E5CE6',
              color: '#fff',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            className="hover:opacity-90"
          >
            Değerlendirmeye Başla
          </button>

          <p style={{ fontSize: 11, color: '#aaa', marginTop: 16 }}>
            24 soru · ~5 dakika · Sonuçlar anında
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>Güçlü Yön Değerlendirmesi</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>UpStrengths-TR · 24 Soru</p>
        </div>
        <button
          onClick={() => router.push('/guclu-yonler')}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            background: '#fff',
            fontSize: 13,
            color: '#888',
            cursor: 'pointer',
          }}
          className="hover:bg-[#fafafa]"
        >
          Vazgeç
        </button>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
            {answeredCount}/{totalQuestions} tamamlandı
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#5E5CE6' }}>
            %{Math.round(progressPct)}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 6,
            background: '#f0f0f0',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              background: '#5E5CE6',
              borderRadius: 3,
              transition: 'width 300ms ease',
            }}
          />
        </div>
      </div>

      {/* Question Navigation Dots */}
      <div className="flex flex-wrap gap-1.5">
        {ASSESSMENT_QUESTIONS.map((q, index) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = index === currentQuestion;
          const qDomain = STRENGTH_DOMAINS.find((d) => d.id === q.domainId);
          return (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(index)}
              title={`Soru ${index + 1} — ${qDomain?.name_tr ?? ''}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: isCurrent ? `2px solid ${qDomain?.color ?? '#5E5CE6'}` : '1px solid #f0f0f0',
                background: isAnswered ? `${qDomain?.color ?? '#5E5CE6'}20` : '#fff',
                color: isAnswered ? qDomain?.color ?? '#5E5CE6' : '#aaa',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 100ms',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="hover:opacity-80"
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      {question && domain && (
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #f0f0f0',
            padding: 32,
          }}
        >
          {/* Domain Badge */}
          <div className="flex items-center gap-2" style={{ marginBottom: 20 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                color: domain.color,
                background: `${domain.color}14`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: domain.color }} />
              {domain.name_tr}
            </span>
            <span style={{ fontSize: 12, color: '#aaa' }}>·</span>
            <span style={{ fontSize: 12, color: '#aaa' }}>{question.facet}</span>
          </div>

          {/* Question Text */}
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#111',
              lineHeight: 1.5,
              marginBottom: 28,
            }}
          >
            {question.text_tr}
          </h2>

          {/* Likert Scale */}
          <div className="flex flex-col gap-2.5">
            {LIKERT_OPTIONS.map((option) => {
              const isSelected = answers[question.id] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: isSelected
                      ? `2px solid ${domain.color}`
                      : '1px solid #f0f0f0',
                    background: isSelected ? `${domain.color}08` : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  className="hover:border-[#ddd]"
                >
                  {/* Radio circle */}
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: isSelected ? `6px solid ${domain.color}` : '2px solid #ddd',
                      flexShrink: 0,
                      transition: 'all 150ms',
                    }}
                  />
                  {/* Label */}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#111' : '#555',
                    }}
                  >
                    {option.label}
                  </span>
                  {/* Score indicator */}
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      fontWeight: 600,
                      color: isSelected ? domain.color : '#ccc',
                    }}
                  >
                    {option.value}/5
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            background: '#fff',
            fontSize: 13,
            fontWeight: 500,
            color: currentQuestion === 0 ? '#ccc' : '#555',
            cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
          }}
          className="hover:bg-[#fafafa]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Önceki
        </button>

        <div className="flex items-center gap-3">
          {currentQuestion < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentQuestion((prev) => Math.min(totalQuestions - 1, prev + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                background: '#fff',
                fontSize: 13,
                fontWeight: 500,
                color: '#555',
                cursor: 'pointer',
              }}
              className="hover:bg-[#fafafa]"
            >
              Sonraki
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : null}

          {allAnswered && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                borderRadius: 10,
                background: isSubmitting ? '#999' : '#5E5CE6',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 150ms',
              }}
              className="hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Hesaplanıyor...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Sonuçları Gör
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Unanswered warning */}
      {!allAnswered && answeredCount > 0 && (
        <div
          style={{
            background: '#FEF3C7',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            color: '#92400E',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          {totalQuestions - answeredCount} soru cevaplanmadı. Sonuçları görmek için tüm soruları cevaplayın.
        </div>
      )}
    </div>
  );
}
