import { useSession } from '../../app/session'
import { useMock } from '../../mock/store'

export function useHospital() {
  const { user } = useSession()
  const mock = useMock()
  const hospitalId = user?.hospitalId ?? 'shanti'

  return {
    ...mock,
    hospitalId,
    hospital: mock.db.hospitals.find((hospital) => hospital.id === hospitalId),
    wards: mock.db.wards.filter((ward) => ward.hospitalId === hospitalId),
  }
}
