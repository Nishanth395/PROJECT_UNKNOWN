import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/models/worker_profile.dart';

void main() {
  group('WorkerProfileModel Parsing & Completion Tests', () {
    test('Correctly deserializes from valid backend worker profile payload', () {
      final json = {
        'worker_id': 'b0000000-0000-0000-0000-000000000001',
        'user_id': 'a0000000-0000-0000-0000-000000000001',
        'full_name': 'Ramesh Kumar',
        'email': 'ramesh@example.com',
        'phone': '+919876543201',
        'bio': 'Master plumber with 9 years experience in Bengaluru.',
        'experience_years': 9.0,
        'service_radius_km': 15.0,
        'latitude': 12.9500,
        'longitude': 77.6300,
        'is_available': true,
        'is_verified': true,
        'rating': 4.85,
        'total_reviews': 48,
        'address_text': 'Indiranagar, Bengaluru',
        'skills': [
          {
            'skill_id': '11111111-0000-0000-0000-000000000001',
            'skill_name': 'Pipe Repair',
            'category': 'Plumbing',
            'experience_years': 9.0,
          },
          {
            'skill_id': '11111111-0000-0000-0000-000000000002',
            'skill_name': 'Leak Fixing',
            'category': 'Plumbing',
            'experience_years': 7.0,
          }
        ]
      };

      final profile = WorkerProfileModel.fromJson(json);

      expect(profile.workerId, equals('b0000000-0000-0000-0000-000000000001'));
      expect(profile.userId, equals('a0000000-0000-0000-0000-000000000001'));
      expect(profile.fullName, equals('Ramesh Kumar'));
      expect(profile.bio, contains('Master plumber'));
      expect(profile.experienceYears, equals(9.0));
      expect(profile.serviceRadiusKm, equals(15.0));
      expect(profile.latitude, equals(12.9500));
      expect(profile.longitude, equals(77.6300));
      expect(profile.isAvailable, isTrue);
      expect(profile.isVerified, isTrue);
      expect(profile.rating, equals(4.85));
      expect(profile.totalReviews, equals(48));
      expect(profile.skills.length, equals(2));
      expect(profile.skills[0].skillName, equals('Pipe Repair'));

      // Check 100% completion score
      expect(profile.completionPercentage, equals(100));
    });

    test('Incomplete profile calculates completion score appropriately', () {
      const incomplete = WorkerProfileModel(
        workerId: 'w-1',
        userId: 'u-1',
        fullName: 'New Worker',
        bio: null,
        experienceYears: 0.0,
        serviceRadiusKm: 0.0,
        latitude: null,
        longitude: null,
        skills: [],
      );

      expect(incomplete.completionPercentage, equals(0));
    });
  });
}
