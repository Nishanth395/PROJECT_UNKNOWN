import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/models/worker_profile.dart';

void main() {
  group('WorkerSkillItemModel & Profile Tests', () {
    test('WorkerSkillItemModel serializes and deserializes cleanly', () {
      const skill = WorkerSkillItemModel(
        skillId: '11111111-0000-0000-0000-000000000001',
        skillName: 'House Wiring',
        category: 'Electrical',
        experienceYears: 4.5,
      );

      final json = skill.toJson();
      expect(json['skill_id'], equals('11111111-0000-0000-0000-000000000001'));
      expect(json['skill_name'], equals('House Wiring'));
      expect(json['category'], equals('Electrical'));
      expect(json['experience_years'], equals(4.5));

      final fromJson = WorkerSkillItemModel.fromJson(json);
      expect(fromJson.skillId, equals(skill.skillId));
      expect(fromJson.skillName, equals(skill.skillName));
      expect(fromJson.experienceYears, equals(4.5));
    });

    test('WorkerProfileModel serializes back to JSON correctly', () {
      const profile = WorkerProfileModel(
        workerId: 'w-100',
        userId: 'u-100',
        fullName: 'Sunita Rao',
        bio: 'Automotive mechanic',
        experienceYears: 7.0,
        serviceRadiusKm: 20.0,
        latitude: 12.9716,
        longitude: 77.5946,
        isAvailable: true,
        isVerified: true,
        rating: 4.9,
        totalReviews: 55,
      );

      final json = profile.toJson();
      expect(json['worker_id'], equals('w-100'));
      expect(json['user_id'], equals('u-100'));
      expect(json['full_name'], equals('Sunita Rao'));
      expect(json['experience_years'], equals(7.0));
      expect(json['service_radius_km'], equals(20.0));
      expect(json['is_available'], isTrue);
      expect(json['is_verified'], isTrue);
      expect(json['rating'], equals(4.9));
      expect(json['total_reviews'], equals(55));
    });
  });
}
