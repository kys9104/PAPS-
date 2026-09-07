import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Save,
  X,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Send
} from 'lucide-react';
import { getTeacherSettings, saveTeacherSettings, exportToGoogleSheetGas } from '../services/storageService';

interface GasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * [신안해양과학고등학교 체육과 PAPS & FITT 데이터 연동 스크립트]
 * 1. 메뉴: 확장 프로그램 > Apps Script
 * 2. 기존 코드를 모두 지우고 이 코드를 붙여넣기
 * 3. [배포] > [새 배포] > 유형: [웹 앱]
 * 4. 실행 권한: [나], 액세스 권한: [모든 사용자 (Anyone)] 설정 후 배포!
 * 5. 생성된 웹 앱 URL을 웹 애플리케이션의 'GAS URL'에 등록하세요.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // 동시 전송 시 행 덮어쓰기 방지 (최대 10초 대기)
  lock.tryLock(10000);

  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");

    // ==========================================
    // 1. PAPS 체력 측정 결과 처리 (Sheet: PAPS_결과)
    // ==========================================
    if (data.type === 'PAPS') {
      var sheet = ss.getSheetByName('PAPS_결과');
      if (!sheet) {
        sheet = ss.insertSheet('PAPS_결과');
        sheet.appendRow([
          '기록일시', '학번', '이름', '성별', '종합등급', 'PAPS총점',
          '심폐종목', '심폐기록', '심폐등급',
          '유연성종목', '유연성기록', '유연성등급',
          '근력종목', '근력기록', '근력등급',
          '순발력종목', '순발력기록', '순발력등급',
          '키(cm)', '몸무게(kg)', 'BMI', '체형판정'
        ]);
        sheet.getRange(1, 1, 1, 22).setBackground('#0f172a').setFontColor('#38bdf8').setFontWeight('bold');
        sheet.setFrozenRows(1);
      }

      var p = data.payload || {};
      sheet.appendRow([
        now,
        p.studentId || '',
        p.studentName || '',
        p.gender || '',
        p.overallGrade ? p.overallGrade + '등급' : '',
        p.totalScore || 0,
        p.cardio ? p.cardio.testType : '',
        p.cardio ? p.cardio.value + ' ' + (p.cardio.unit || '') : '',
        p.cardio ? p.cardio.grade + '등급' : '',
        p.flexibility ? p.flexibility.testType : '',
        p.flexibility ? p.flexibility.value + ' ' + (p.flexibility.unit || '') : '',
        p.flexibility ? p.flexibility.grade + '등급' : '',
        p.strength ? p.strength.testType : '',
        p.strength ? p.strength.value + ' ' + (p.strength.unit || '') : '',
        p.strength ? p.strength.grade + '등급' : '',
        p.agility ? p.agility.testType : '',
        p.agility ? p.agility.value + ' ' + (p.agility.unit || '') : '',
        p.agility ? p.agility.grade + '등급' : '',
        p.bodyComp ? p.bodyComp.height : '',
        p.bodyComp ? p.bodyComp.weight : '',
        p.bodyComp ? p.bodyComp.bmi : '',
        p.bodyComp ? (p.bodyComp.status || '') : ''
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        type: 'PAPS',
        message: 'PAPS_결과 시트에 성공적으로 저장되었습니다.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 2. FITT 운동 처방 데이터 처리 (Sheet: FITT_처방)
    // ==========================================
    else if (data.type === 'FITT') {
      var fSheet = ss.getSheetByName('FITT_처방');
      if (!fSheet) {
        fSheet = ss.insertSheet('FITT_처방');
        fSheet.appendRow([
          '기록일시', '학번', '이름',
          '빈도(F)', '강도(I)', '시간(T)', '형태(T)',
          '본운동 8개 루틴', '체력목표선언', '5대원리점검'
        ]);
        fSheet.getRange(1, 1, 1, 10).setBackground('#0f172a').setFontColor('#e8fd3b').setFontWeight('bold');
        fSheet.setFrozenRows(1);
      }

      var f = data.payload || {};
      var routineText = '';
      if (f.mainExercises && f.mainExercises.length > 0) {
        routineText = f.mainExercises.map(function(ex, i) {
          return (i + 1) + '. ' + ex.name + '(' + ex.durationOrReps + ')';
        }).join(' / ');
      } else if (f.mainRoutine) {
        routineText = f.mainRoutine;
      }

      var principleText = '';
      if (f.principlesChecklist) {
        principleText = [
          f.principlesChecklist.overload ? '과부하[O]' : '과부하[X]',
          f.principlesChecklist.progression ? '점진성[O]' : '점진성[X]',
          f.principlesChecklist.specificity ? '특수성[O]' : '특수성[X]',
          f.principlesChecklist.individuality ? '개별성[O]' : '개별성[X]',
          f.principlesChecklist.continuity ? '지속성[O]' : '지속성[X]'
        ].join(', ');
      }

      fSheet.appendRow([
        now,
        f.studentId || '',
        f.studentName || '',
        f.frequency || '',
        f.intensity || '',
        f.time || '',
        f.type || '',
        routineText,
        f.goalStatement || '',
        principleText
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        type: 'FITT',
        message: 'FITT_처방 시트에 성공적으로 저장되었습니다.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: '알 수 없는 데이터 타입: ' + data.type
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

export const GasSettingsModal: React.FC<GasSettingsModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentSettings, setCurrentSettings] = useState(() => getTeacherSettings());
  const [gasUrl, setGasUrl] = useState(currentSettings.googleSheetWebhookUrl || '');
  const [schoolName, setSchoolName] = useState(currentSettings.schoolName || '신안해양과학고등학교');
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = () => {
    const updated = {
      ...currentSettings,
      googleSheetWebhookUrl: gasUrl.trim(),
      schoolName: schoolName.trim()
    };
    saveTeacherSettings(updated);
    setCurrentSettings(updated);
    setSaveStatus('설정이 성공적으로 저장되었습니다!');
    setTimeout(() => setSaveStatus(null), 3000);
    if (onSuccess) onSuccess();
  };

  const handleTestSend = async () => {
    if (!gasUrl.trim()) {
      alert('먼저 구글 웹 앱 URL을 입력해주세요.');
      return;
    }
    setIsTesting(true);
    const result = await exportToGoogleSheetGas('PAPS', {
      studentId: '1-1-00',
      studentName: '테스트학생',
      gender: '남',
      overallGrade: 1,
      totalScore: 92,
      cardio: { testType: '왕복오래달리기', value: 80, unit: '회', grade: 1 },
      flexibility: { testType: '앉아윗몸앞으로굽히기', value: 20.5, unit: 'cm', grade: 1 },
      strength: { testType: '악력', value: 50.2, unit: 'kg', grade: 1 },
      agility: { testType: '50m달리기', value: 7.1, unit: '초', grade: 1 },
      bodyComp: { height: 175, weight: 68, bmi: 22.2, status: '표준' }
    });
    setIsTesting(false);
    alert(result.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0d172e] border border-[#1e2f5b] rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 bg-[#142245] border-b border-[#1e2f5b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Google Apps Script
                </span>
                <span className="text-[10px] font-bold text-slate-400">교사 전용</span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white mt-0.5">
                구글 스프레드시트(GAS) 자동 연동 설정
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-[#1c2e5a] transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Information Banner */}
          <div className="p-4 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#E8FD3B] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">구글 시트 연동 원리 안내:</strong>
              <p className="mt-1 text-slate-400">
                PAPS 측정 결과와 5차시 맞춤형 운동 처방(FITT) 데이터를 선생님의 구글 스프레드시트에{' '}
                <strong className="text-emerald-300">PAPS_결과</strong> 및{' '}
                <strong className="text-emerald-300">FITT_처방</strong> 탭으로 자동 분기 저장합니다.
                API 호출 과부하를 방지하기 위해 [시트로 내보내기] 버튼 클릭 시에만 안정적으로 전송됩니다.
              </p>
            </div>
          </div>

          {/* Webhook URL Input */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-200">
              배포된 Google Apps Script 웹 앱 URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-[#070e1e] border border-[#1e2f5b] focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-500 outline-none"
              />
              <button
                type="button"
                onClick={handleTestSend}
                disabled={isTesting || !gasUrl}
                className="px-3.5 py-2.5 rounded-xl bg-[#142245] hover:bg-[#1c2e5a] text-xs font-bold text-slate-200 border border-[#1e2f5b] flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isTesting ? '테스트 중...' : '연동 테스트'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              * Apps Script에서 [배포] 후 발급받은 웹 앱 URL을 붙여넣으세요.
            </p>
          </div>

          {/* Deployment Step-by-Step Guide */}
          <div className="p-4 bg-[#142245]/60 border border-[#1e2f5b] rounded-2xl space-y-2.5">
            <h4 className="text-xs font-black text-slate-200 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>3분 완성 구글 시트 배포 가이드</span>
            </h4>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                새 구글 스프레드시트를 열고 상단 메뉴의{' '}
                <span className="font-bold text-white">[확장 프로그램] → [Apps Script]</span>를 클릭합니다.
              </li>
              <li>
                아래 박스의 <span className="font-bold text-[#E8FD3B]">[스크립트 코드 복사]</span> 버튼을 눌러
                코드를 복사한 뒤, 스크립트 편집기에 붙여넣고 저장(Ctrl+S)합니다.
              </li>
              <li>
                우측 상단의 <span className="font-bold text-white">[배포] → [새 배포]</span>를 클릭하고,
                유형을 <span className="font-bold text-emerald-400">[웹 앱]</span>으로 선택합니다.
              </li>
              <li>
                액세스 권한을 반드시 <span className="font-bold text-rose-400">[모든 사용자 (Anyone)]</span>로
                설정하고 배포를 완료합니다.
              </li>
              <li>발급된 웹 앱 URL을 위 입력창에 등록하면 설정이 완료됩니다!</li>
            </ol>
          </div>

          {/* Code.gs Code Viewer & Copy Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>Code.gs 스크립트 소스코드</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  PAPS / FITT 자동 분기 완비
                </span>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-black'
                    : 'bg-[#E8FD3B] text-black hover:bg-[#d8ed2a]'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사 완료!' : '스크립트 코드 복사'}</span>
              </button>
            </div>
            <div className="relative">
              <pre className="p-4 bg-[#070e1e] border border-[#1e2f5b] rounded-2xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>

          {saveStatus && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{saveStatus}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#142245] border-t border-[#1e2f5b] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#070e1e] hover:bg-[#142245] text-xs font-bold text-slate-300 border border-[#1e2f5b] transition cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#E8FD3B] hover:bg-[#d8ed2a] text-xs font-black text-black flex items-center gap-1.5 transition shadow-lg cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>설정 저장하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
