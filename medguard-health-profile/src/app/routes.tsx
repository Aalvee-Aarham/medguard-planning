import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout, BareLayout, WideLayout } from './Layout'
import { Gates } from './Gates'
import { ListSkeleton } from '../components/states'
// A. First launch and sign-in (eager: first paint)
import { Splash, Language, Consent, AccountType, FirstProfile, Biometric, NotifPermission } from '../screens/onboarding/Start'
import { AuthHome, PhoneEntry, Otp, EmailSignup, EmailLogin, Forgot, VerifyEmail, LockScreen } from '../screens/onboarding/Auth'
// B. Home
import Home from '../screens/home/Home'
import Menu from '../screens/home/Menu'

// The 3D Welcome and every other area load on demand, so the first screen stays light
const Welcome = lazy(() => import('../screens/onboarding/Welcome'))
const L = <T,>(f: () => Promise<T>, k: keyof T) => lazy(() => f().then((m) => ({ default: m[k] as unknown as React.ComponentType })))

const up = () => import('../screens/upload/Upload')
const rec = () => import('../screens/record/Record')
const med = () => import('../screens/medicines/Medicines')
const ai = () => import('../screens/ai/Ai')
const sim = () => import('../screens/similar/Similar')
const sh = () => import('../screens/share/Share')
const fam = () => import('../screens/family/Family')
const doc = () => import('../screens/doctor/Doctor')
const pre = () => import('../screens/premium/Premium')
const noti = () => import('../screens/notifications/Notifications')
const set = () => import('../screens/settings/Settings')

const S = {
  // C. Upload and AI extraction
  UploadSource: L(up, 'UploadSource'), CameraCapture: L(up, 'CameraCapture'), Processing: L(up, 'Processing'), Issues: L(up, 'Issues'), Review: L(up, 'Review'), Failed: L(up, 'Failed'),
  // D. My Record
  RecordOverview: L(rec, 'RecordOverview'), SectionList: L(rec, 'SectionList'), TestDetail: L(rec, 'TestDetail'), DocumentViewer: L(rec, 'DocumentViewer'), EditItem: L(rec, 'EditItem'), Timeline: L(rec, 'Timeline'), AdmissionDetail: L(rec, 'AdmissionDetail'), ManualEntry: L(rec, 'ManualEntry'),
  // E. Medicines
  MedicineList: L(med, 'MedicineList'), MedicineDetail: L(med, 'MedicineDetail'), ReminderSetup: L(med, 'ReminderSetup'), ReminderAction: L(med, 'ReminderAction'), TakenLog: L(med, 'TakenLog'),
  // F. Ask AI
  Chat: L(ai, 'Chat'), ChatHistory: L(ai, 'ChatHistory'),
  // G. Similar cases
  SimilarDisclaimer: L(sim, 'SimilarDisclaimer'), SimilarSetup: L(sim, 'SimilarSetup'), SimilarResults: L(sim, 'SimilarResults'), CaseDetail: L(sim, 'CaseDetail'), SavedCases: L(sim, 'SavedCases'),
  // H. Share and access
  MyQr: L(sh, 'MyQr'), ShareDoctor: L(sh, 'ShareDoctor'), WhoHasAccess: L(sh, 'WhoHasAccess'), AccessLog: L(sh, 'AccessLog'), EmergencyNotice: L(sh, 'EmergencyNotice'),
  // I. Family
  Family: L(fam, 'Family'), AddFamily: L(fam, 'AddFamily'), Caregivers: L(fam, 'Caregivers'), Invitation: L(fam, 'Invitation'),
  // J. Doctor
  BmdcVerify: L(doc, 'BmdcVerify'), DoctorHome: L(doc, 'DoctorHome'), ScanQr: L(doc, 'ScanQr'), DoctorPatient: L(doc, 'DoctorPatient'), AddPrescription: L(doc, 'AddPrescription'), DoctorProfile: L(doc, 'DoctorProfile'),
  // K. Premium
  Plans: L(pre, 'Plans'), Checkout: L(pre, 'Checkout'), Subscription: L(pre, 'Subscription'),
  // L. Notifications
  Inbox: L(noti, 'Inbox'), NotifSettings: L(noti, 'NotifSettings'),
  // S. Settings
  SettingsHome: L(set, 'SettingsHome'), PersonalInfo: L(set, 'PersonalInfo'), ChangePhone: L(set, 'ChangePhone'), ChangeEmail: L(set, 'ChangeEmail'), ChangePassword: L(set, 'ChangePassword'), SignInMethods: L(set, 'SignInMethods'), Security: L(set, 'Security'), TextSize: L(set, 'TextSize'), Privacy: L(set, 'Privacy'), ExportData: L(set, 'ExportData'), DeleteAccount: L(set, 'DeleteAccount'), Help: L(set, 'Help'), ContactSupport: L(set, 'ContactSupport'), About: L(set, 'About'),
}

function Fallback() {
  return (
    <div className="px-4 pt-4">
      <ListSkeleton />
    </div>
  )
}

/** One route per screen ID (PLAN.md section 6). Sheets and dialogs (H52, H60, H33, S17) open over the current route. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Gates>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route element={<BareLayout />}>
              <Route path="/" element={<Splash />} /> {/* H1 */}
              <Route path="/start/language" element={<Language />} /> {/* H2 */}
              <Route path="/auth" element={<AuthHome />} /> {/* H4 */}
              <Route path="/auth/phone" element={<PhoneEntry />} /> {/* H5 */}
              <Route path="/auth/otp" element={<Otp />} /> {/* H6 */}
              <Route path="/auth/email/signup" element={<EmailSignup />} /> {/* H7 */}
              <Route path="/auth/email/login" element={<EmailLogin />} /> {/* H8 */}
              <Route path="/auth/forgot" element={<Forgot />} /> {/* H9 */}
              <Route path="/auth/verify-email" element={<VerifyEmail />} /> {/* H10 */}
              <Route path="/start/consent" element={<Consent />} /> {/* H11 */}
              <Route path="/start/account-type" element={<AccountType />} /> {/* H12 */}
              <Route path="/start/profile" element={<FirstProfile />} /> {/* H13 */}
              <Route path="/start/biometric" element={<Biometric />} /> {/* H14 */}
              <Route path="/start/notifications" element={<NotifPermission />} /> {/* H15 */}
              <Route path="/lock" element={<LockScreen />} /> {/* H16 */}
              <Route path="/doctor/verify" element={<S.BmdcVerify />} /> {/* J1 */}
            </Route>
            <Route element={<WideLayout />}>
              <Route path="/start/welcome" element={<Welcome />} /> {/* H3 */}
            </Route>
            <Route element={<AppLayout />}>
              <Route path="/home" element={<Home />} /> {/* H17, H18 */}
              <Route path="/menu" element={<Menu />} />
              <Route path="/upload" element={<S.UploadSource />} /> {/* H19 */}
              <Route path="/upload/camera" element={<S.CameraCapture />} /> {/* H20 */}
              <Route path="/upload/:id" element={<S.Processing />} /> {/* H21 */}
              <Route path="/upload/:id/issues" element={<S.Issues />} /> {/* H22 */}
              <Route path="/upload/:id/review" element={<S.Review />} /> {/* H23 */}
              <Route path="/record/add" element={<S.ManualEntry />} /> {/* H24 */}
              <Route path="/upload/:id/failed" element={<S.Failed />} /> {/* H25 */}
              <Route path="/record" element={<S.RecordOverview />} /> {/* H26 */}
              <Route path="/record/tests/:id" element={<S.TestDetail />} /> {/* H28 */}
              <Route path="/record/items/:id/edit" element={<S.EditItem />} /> {/* H30 */}
              <Route path="/record/:section" element={<S.SectionList />} /> {/* H27 */}
              <Route path="/documents/:id" element={<S.DocumentViewer />} /> {/* H29 */}
              <Route path="/timeline" element={<S.Timeline />} /> {/* H31 */}
              <Route path="/admissions/:id" element={<S.AdmissionDetail />} /> {/* H32 (+ H33 dialog) */}
              <Route path="/medicines" element={<S.MedicineList />} /> {/* H34 */}
              <Route path="/medicines/:id" element={<S.MedicineDetail />} /> {/* H35 */}
              <Route path="/medicines/:id/reminder" element={<S.ReminderSetup />} /> {/* H36 */}
              <Route path="/reminders/:doseId" element={<S.ReminderAction />} /> {/* H37 */}
              <Route path="/medicines/:id/log" element={<S.TakenLog />} /> {/* H38 */}
              <Route path="/ai" element={<S.Chat />} /> {/* H39 */}
              <Route path="/ai/history" element={<S.ChatHistory />} /> {/* H40 */}
              <Route path="/similar/disclaimer" element={<S.SimilarDisclaimer />} /> {/* H41 */}
              <Route path="/similar" element={<S.SimilarSetup />} /> {/* H42 */}
              <Route path="/similar/results" element={<S.SimilarResults />} /> {/* H43 banner + H44 */}
              <Route path="/similar/cases/:id" element={<S.CaseDetail />} /> {/* H45 */}
              <Route path="/similar/saved" element={<S.SavedCases />} /> {/* H46 */}
              <Route path="/share/qr" element={<S.MyQr />} /> {/* H47 */}
              <Route path="/share/doctor" element={<S.ShareDoctor />} /> {/* H48 */}
              <Route path="/share/access" element={<S.WhoHasAccess />} /> {/* H49 */}
              <Route path="/share/log" element={<S.AccessLog />} /> {/* H50 */}
              <Route path="/share/emergency/:id" element={<S.EmergencyNotice />} /> {/* H51 */}
              <Route path="/family" element={<S.Family />} /> {/* H53 (H52 is the switcher sheet) */}
              <Route path="/family/add" element={<S.AddFamily />} /> {/* H54 */}
              <Route path="/family/:profileId/caregivers" element={<S.Caregivers />} /> {/* H55 */}
              <Route path="/invites/:id" element={<S.Invitation />} /> {/* H56 */}
              <Route path="/doctor" element={<S.DoctorHome />} /> {/* J2 */}
              <Route path="/doctor/scan" element={<S.ScanQr />} /> {/* J3 */}
              <Route path="/doctor/patients/:id" element={<S.DoctorPatient />} /> {/* J4 */}
              <Route path="/doctor/patients/:id/add" element={<S.AddPrescription />} /> {/* J5 */}
              <Route path="/doctor/profile" element={<S.DoctorProfile />} /> {/* J6 */}
              <Route path="/premium" element={<S.Plans />} /> {/* H57 (H60 is the limit sheet) */}
              <Route path="/premium/checkout" element={<S.Checkout />} /> {/* H58 */}
              <Route path="/premium/subscription" element={<S.Subscription />} /> {/* H59 */}
              <Route path="/notifications" element={<S.Inbox />} /> {/* H61 */}
              <Route path="/settings/notifications" element={<S.NotifSettings />} /> {/* H62 = S10 */}
              <Route path="/settings" element={<S.SettingsHome />} /> {/* S1 (+ S17 dialog) */}
              <Route path="/settings/personal" element={<S.PersonalInfo />} /> {/* S2 */}
              <Route path="/settings/phone" element={<S.ChangePhone />} /> {/* S3 */}
              <Route path="/settings/email" element={<S.ChangeEmail />} /> {/* S4 */}
              <Route path="/settings/password" element={<S.ChangePassword />} /> {/* S5 */}
              <Route path="/settings/sign-in" element={<S.SignInMethods />} /> {/* S6 */}
              <Route path="/settings/security" element={<S.Security />} /> {/* S7 */}
              <Route path="/settings/language" element={<Language settings />} /> {/* S8 */}
              <Route path="/settings/text-size" element={<S.TextSize />} /> {/* S9 */}
              <Route path="/settings/privacy" element={<S.Privacy />} /> {/* S11 */}
              <Route path="/settings/export" element={<S.ExportData />} /> {/* S12 */}
              <Route path="/settings/delete" element={<S.DeleteAccount />} /> {/* S13 */}
              <Route path="/help" element={<S.Help />} /> {/* S14 */}
              <Route path="/help/contact" element={<S.ContactSupport />} /> {/* S15 */}
              <Route path="/about" element={<S.About />} /> {/* S16 */}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Gates>
    </BrowserRouter>
  )
}
