import { DataSource } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import { User } from '../users/user.entity';

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  const count = await userRepository.count();
  if (count > 0) {
    return;
  }

  const saltRounds = 10;

  const users: Partial<User>[] = [
    {
      name: 'Admin User',
      email: 'admin@example.com',
      password: bcryptjs.hashSync('Admin123!', saltRounds),
      role: 'admin',
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: bcryptjs.hashSync('Jane123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Carlos Rivera',
      email: 'carlos.rivera@example.com',
      password: bcryptjs.hashSync('Carlos123!', saltRounds),
      role: 'editor',
    },
    {
      name: 'Emily Chen',
      email: 'emily.chen@example.com',
      password: bcryptjs.hashSync('Emily123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Marcus Johnson',
      email: 'marcus.johnson@example.com',
      password: bcryptjs.hashSync('Marcus123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Sofia Andersson',
      email: 'sofia.andersson@example.com',
      password: bcryptjs.hashSync('Sofia123!', saltRounds),
      role: 'editor',
    },
    {
      name: 'David Kim',
      email: 'david.kim@example.com',
      password: bcryptjs.hashSync('David123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Olivia Brown',
      email: 'olivia.brown@example.com',
      password: bcryptjs.hashSync('Olivia123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@example.com',
      password: bcryptjs.hashSync('Ahmed123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@example.com',
      password: bcryptjs.hashSync('Priya123!', saltRounds),
      role: 'editor',
    },
    {
      name: 'Lucas Ferreira',
      email: 'lucas.ferreira@example.com',
      password: bcryptjs.hashSync('Lucas123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Mia Williams',
      email: 'mia.williams@example.com',
      password: bcryptjs.hashSync('Mia12345!', saltRounds),
      role: 'user',
    },
    {
      name: 'Hiroshi Tanaka',
      email: 'hiroshi.tanaka@example.com',
      password: bcryptjs.hashSync('Hiroshi123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Isabella Garcia',
      email: 'isabella.garcia@example.com',
      password: bcryptjs.hashSync('Isabella123!', saltRounds),
      role: 'editor',
    },
    {
      name: 'Nathan Wright',
      email: 'nathan.wright@example.com',
      password: bcryptjs.hashSync('Nathan123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Fatima Al-Rashid',
      email: 'fatima.alrashid@example.com',
      password: bcryptjs.hashSync('Fatima123!', saltRounds),
      role: 'user',
    },
    {
      name: 'James O\'Brien',
      email: 'james.obrien@example.com',
      password: bcryptjs.hashSync('James123!', saltRounds),
      role: 'editor',
    },
    {
      name: 'Yuki Nakamura',
      email: 'yuki.nakamura@example.com',
      password: bcryptjs.hashSync('Yuki1234!', saltRounds),
      role: 'user',
    },
    {
      name: 'Rachel Torres',
      email: 'rachel.torres@example.com',
      password: bcryptjs.hashSync('Rachel123!', saltRounds),
      role: 'user',
    },
    {
      name: 'Daniel Okonkwo',
      email: 'daniel.okonkwo@example.com',
      password: bcryptjs.hashSync('Daniel123!', saltRounds),
      role: 'user',
    },
  ];

  await userRepository.save(users);
  console.log(`Seeded ${users.length} users into the database.`);
}
