import React from 'react';
import type { AcademicSubject } from '../types';

export const HilaacLogo: React.FC<{ size?: number; inverted?: boolean }> = ({
  size = 38,
  inverted = false,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Hilaac Healthcare Learning Platform Logo"
    className="shrink-0"
  >
    <rect
      x="3"
      y="3"
      width="114"
      height="114"
      rx="24"
      fill={inverted ? '#0D172B' : '#FFFFFF'}
      stroke={inverted ? '#1E2E4D' : '#D8E2EE'}
      strokeWidth="3"
    />
    <rect x="26" y="25" width="20" height="58" rx="4" fill={inverted ? '#FFFFFF' : '#10234B'} />
    <rect x="74" y="25" width="20" height="58" rx="4" fill="#079B62" />
    <rect x="26" y="46" width="68" height="16" rx="4" fill="#079B62" />
    <circle cx="84" cy="25" r="7" fill="#F59E0B" />
    <text
      x="60"
      y="104"
      textAnchor="middle"
      fill={inverted ? '#E2E8F0' : '#10234B'}
      fontFamily="Plus Jakarta Sans, Arial, sans-serif"
      fontWeight="800"
      fontSize="10"
      letterSpacing="1.2"
    >
      HILAAC
    </text>
  </svg>
);

export const SubjectEmblemSvg: React.FC<{ subject: AcademicSubject; size?: number }> = ({
  subject,
  size = 36,
}) => {
  if (subject === 'Pharmacology') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#ECFDF5" />
        <g transform="rotate(-35 20 20)">
          <rect x="11" y="14" width="9" height="12" rx="4.5" fill="#10234B" />
          <rect x="20" y="14" width="9" height="12" rx="4.5" fill="#079B62" />
        </g>
        <circle cx="30" cy="11" r="3" fill="#F59E0B" />
      </svg>
    );
  }
  if (subject === 'Anatomy & Physiology') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#EFF6FF" />
        <path
          d="M20 30 C10 23 9 14 14.5 11.5 C17.3 10.2 19 12 20 14 C21 12 22.7 10.2 25.5 11.5 C31 14 30 23 20 30 Z"
          fill="#10234B"
        />
        <path
          d="M11 21 H16 L18 17 L21 25 L23.5 21 H29"
          fill="none"
          stroke="#079B62"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (subject === 'Microbiology') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#ECFDF5" />
        <circle cx="20" cy="20" r="8" fill="#079B62" fillOpacity="0.18" stroke="#079B62" strokeWidth="2" />
        <circle cx="17.5" cy="18.5" r="2.2" fill="#10234B" />
        <circle cx="23" cy="22" r="1.8" fill="#F59E0B" />
        <line x1="20" y1="8" x2="20" y2="12" stroke="#10234B" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="28" x2="20" y2="32" stroke="#10234B" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="20" x2="12" y2="20" stroke="#10234B" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="20" x2="32" y2="20" stroke="#10234B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (subject === 'Biochemistry') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#FFFBEB" />
        <path
          d="M17 10 H23 V15.5 L28.5 26.5 C29.2 28 28.1 30 26.4 30 H13.6 C11.9 30 10.8 28 11.5 26.5 L17 15.5 Z"
          fill="#FFFFFF"
          stroke="#10234B"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M13.5 24 H26.5 L28 27.2 C28.2 28 27.6 29 26.4 29 H13.6 C12.4 29 11.8 28 12 27.2 Z" fill="#F59E0B" />
        <circle cx="20" cy="20" r="1.5" fill="#079B62" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#F1F5F9" />
      <rect x="11" y="10" width="18" height="21" rx="3" fill="#FFFFFF" stroke="#10234B" strokeWidth="2" />
      <rect x="16" y="7" width="8" height="5" rx="1.5" fill="#F59E0B" />
      <path d="M20 16 V24 M16 20 H24" stroke="#079B62" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
};

export const MedSvgIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'inhaler') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="10" width="14" height="24" rx="3" fill="#10234B" />
        <rect x="18" y="34" width="28" height="7" rx="2" fill="#079B62" />
        <rect x="21" y="4" width="8" height="6" fill="#F59E0B" />
      </svg>
    );
  }
  if (type === 'vial') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="23" y="4" width="14" height="5" rx="1" fill="#079B62" />
        <rect x="21" y="9" width="18" height="4" fill="#94A3B8" />
        <rect x="19" y="13" width="22" height="30" rx="4" fill="#FFFFFF" stroke="#10234B" strokeWidth="2" />
        <rect x="19" y="21" width="22" height="11" fill="#FDE68A" />
      </svg>
    );
  }
  if (type === 'insulin') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="16" width="34" height="14" rx="5" fill="#10234B" />
        <rect x="42" y="19" width="12" height="8" rx="1" fill="#079B62" />
        <line x1="54" y1="23" x2="61" y2="23" stroke="#64748B" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'tablets') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="22" cy="28" rx="10" ry="6" fill="#079B62" stroke="#10234B" strokeWidth="1.5" />
        <ellipse cx="42" cy="24" rx="10" ry="6" fill="#F59E0B" stroke="#92400E" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="12" width="24" height="31" rx="4" fill="#FFFFFF" stroke="#10234B" strokeWidth="2" />
      <rect x="20" y="6" width="20" height="6" rx="2" fill="#079B62" />
      <rect x="18" y="21" width="24" height="10" fill="#D1FAE5" />
    </svg>
  );
};

export const OrganSvgIcon: React.FC<{ organ: string }> = ({ organ }) => {
  if (organ === 'heart') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="27" y="3" width="5" height="10" fill="#10234B" />
        <rect x="33" y="3" width="5" height="10" fill="#DC2626" />
        <path
          d="M32 43 C14 31 12 16 22 12 C27 10 30 13 32 16 C34 13 37 10 42 12 C52 16 50 31 32 43 Z"
          fill="#DC2626"
          stroke="#7F1D1D"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (organ === 'vessel') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="14" width="48" height="20" rx="10" fill="#FDE68A" stroke="#10234B" strokeWidth="2" />
        <rect x="12" y="18" width="40" height="12" rx="6" fill="#DC2626" />
      </svg>
    );
  }
  if (organ === 'lungs') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 5h4v13h-4z" fill="#10234B" />
        <path d="M30 18 L16 25 C12 28 12 41 20 42 C26 42 29 37 30 31 Z" fill="#D1FAE5" stroke="#079B62" strokeWidth="1.6" />
        <path d="M34 18 L48 25 C52 28 52 41 44 42 C38 42 35 37 34 31 Z" fill="#D1FAE5" stroke="#079B62" strokeWidth="1.6" />
      </svg>
    );
  }
  if (organ === 'brain') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 10 C20 10 13 17 15 26 C12 31 17 38 25 38 L32 38 Z" fill="#E2E8F0" stroke="#10234B" strokeWidth="1.6" />
        <path d="M32 10 C44 10 51 17 49 26 C52 31 47 38 39 38 L32 38 Z" fill="#FDE68A" stroke="#10234B" strokeWidth="1.6" />
      </svg>
    );
  }
  if (organ === 'gi') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M26 7 C17 7 14 16 20 22 C25 27 36 25 41 20 C45 15 39 9 32 11" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
        <rect x="18" y="28" width="28" height="12" rx="6" fill="#FEF3C7" stroke="#B45309" strokeWidth="1.5" />
      </svg>
    );
  }
  if (organ === 'kidney') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M23 11 C15 11 12 20 15 29 C17 35 23 37 26 32 C24 27 24 21 26 16 C25 13 24 11 23 11 Z" fill="#B91C1C" stroke="#10234B" strokeWidth="1.5" />
        <path d="M41 11 C49 11 52 20 49 29 C47 35 41 37 38 32 C40 27 40 21 38 16 C39 13 40 11 41 11 Z" fill="#B91C1C" stroke="#10234B" strokeWidth="1.5" />
      </svg>
    );
  }
  if (organ === 'liver') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22 C14 13 34 12 52 19 C54 25 44 34 27 35 C16 35 11 29 12 22 Z" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="1.5" />
        <ellipse cx="36" cy="34" rx="5" ry="3" fill="#079B62" />
      </svg>
    );
  }
  if (organ === 'thyroid') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="29" y="5" width="6" height="38" fill="#E2E8F0" stroke="#10234B" strokeWidth="1.2" />
        <path d="M29 18 C20 14 14 21 17 30 C19 36 26 35 29 29 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1.3" />
        <path d="M35 18 C44 14 50 21 47 30 C45 36 38 35 35 29 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1.3" />
      </svg>
    );
  }
  if (organ === 'eye') {
    return (
      <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 24 C16 12 48 12 56 24 C48 36 16 36 8 24 Z" fill="#FFFFFF" stroke="#10234B" strokeWidth="2" />
        <circle cx="32" cy="24" r="7" fill="#079B62" />
        <circle cx="32" cy="24" r="3" fill="#10234B" />
      </svg>
    );
  }
  return (
    <svg width="48" height="38" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="12" width="44" height="24" rx="6" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
      <line x1="18" y1="20" x2="46" y2="20" stroke="#D97706" strokeWidth="1.5" />
      <line x1="18" y1="28" x2="46" y2="28" stroke="#D97706" strokeWidth="1.5" />
    </svg>
  );
};
