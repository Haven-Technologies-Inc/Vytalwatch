'use client';
import { TimeTracker } from '@/components/rpm';
export default function PatientRPM() { return <div className='p-6'><TimeTracker patientName='Patient' entries={[]} totalMinutes={15} onStart={async()=>({} as any)} onStop={async()=>({} as any)} /></div>; }