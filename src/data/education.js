import { deepFreeze } from './schemas.js';

export const education = deepFreeze([
  {
    id: 'aivancity-programme-grande-ecole',
    institution: 'Aivancity School for Technology, Business and Society',
    program: 'Programme Grande École',
    startDate: '2024',
    endDate: '2026',
    location: 'Paris, France',
    publicationStatus: 'published',
  },
  {
    id: 'paris-dauphine-psl-mathematics-computer-science',
    institution: 'Paris Dauphine–PSL, Tunis campus',
    program: 'Bachelor’s degree in Mathematics and Computer Science for Decision Making',
    startDate: '2021',
    endDate: '2024',
    location: 'Tunis, Tunisia',
    publicationStatus: 'published',
  },
]);
