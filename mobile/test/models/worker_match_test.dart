import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/models/worker_match.dart';

void main() {
  group('WorkerMatch Model Parsing Tests', () {
    test('Correctly deserializes matching engine response payload', () {
      final json = {
        'request_id': 'e305e940-0255-46fb-a0b4-7b6bb822602e',
        'total_matches': 2,
        'matches': [
          {
            'worker_id': 'b0000000-0000-0000-0000-000000000001',
            'name': 'Ramesh Kumar',
            'category': 'Plumbing',
            'matched_skills': ['Pipe Repair'],
            'distance_km': 3.35,
            'rating': 4.85,
            'total_reviews': 48,
            'experience_years': 9.0,
            'is_verified': true,
            'is_available': true,
            'match_score': 90.57,
          },
          {
            'worker_id': 'b0000000-0000-0000-0000-000000000002',
            'name': 'Suresh Patil',
            'category': 'Plumbing',
            'matched_skills': ['Leak Fixing'],
            'distance_km': 1.74,
            'rating': 4.70,
            'total_reviews': 32,
            'experience_years': 6.5,
            'is_verified': true,
            'is_available': true,
            'match_score': 88.20,
          }
        ]
      };

      final res = WorkerMatchResponse.fromJson(json);

      expect(res.requestId, equals('e305e940-0255-46fb-a0b4-7b6bb822602e'));
      expect(res.totalMatches, equals(2));
      expect(res.matches.length, equals(2));

      final first = res.matches[0];
      expect(first.workerId, equals('b0000000-0000-0000-0000-000000000001'));
      expect(first.name, equals('Ramesh Kumar'));
      expect(first.category, equals('Plumbing'));
      expect(first.matchedSkills, contains('Pipe Repair'));
      expect(first.distanceKm, equals(3.35));
      expect(first.rating, equals(4.85));
      expect(first.totalReviews, equals(48));
      expect(first.experienceYears, equals(9.0));
      expect(first.isVerified, isTrue);
      expect(first.isAvailable, isTrue);
      expect(first.matchScore, equals(90.57));
    });
  });
}
