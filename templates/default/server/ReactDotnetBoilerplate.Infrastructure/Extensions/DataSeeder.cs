using ReactDotnetBoilerplate.Common.Enums;
using ReactDotnetBoilerplate.Domain.Entity.Student;
using ReactDotnetBoilerplate.Domain.Identity;
using ReactDotnetBoilerplate.Infrastructure.DbContexts;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ReactDotnetBoilerplate.Infrastructure.Extensions
{
    public class DataSeeder
    {
        public async Task SeedAsync(RoleManager<AppRole> roleManager, UserManager<AppUser> userManager, ApplicationDbContext context)
        {
            // Thêm Role ..............................................................................................................................................................
            var rootAdminRoleId1 = Guid.Parse("76822012-bb5b-4a95-85dd-6a848bb6e29f");
            if (!await roleManager.RoleExistsAsync("SysAdmin"))
            {
                var role = new AppRole
                {
                    Id = rootAdminRoleId1,
                    Name = "SysAdmin",
                    NormalizedName = "SYSADMIN"
                };
                await roleManager.CreateAsync(role);
            }

            var rootAdminRoleId2 = Guid.Parse("fbfdef8d-26b9-43be-429c-08dde8497090");
            if (!await roleManager.RoleExistsAsync("Admin"))
            {
                var role = new AppRole
                {
                    Id = rootAdminRoleId2,
                    Name = "Admin",
                    NormalizedName = "ADMIN"
                };
                await roleManager.CreateAsync(role);
            }

            var rootAdminRoleId3 = Guid.Parse("4c9b6736-0064-4381-b455-397110f5d0b1");
            if (!await roleManager.RoleExistsAsync("Teacher"))
            {
                var role = new AppRole
                {
                    Id = rootAdminRoleId3,
                    Name = "Teacher",
                    NormalizedName = "TEACHER"
                };
                await roleManager.CreateAsync(role);
            }



            var rootAdminRoleId4 = Guid.Parse("76822012-bb5b-4a95-85dd-6a848bb6e26f");
            if (!await roleManager.RoleExistsAsync("User"))
            {
                var role = new AppRole
                {
                    Id = rootAdminRoleId4,
                    Name = "User",
                    NormalizedName = "USER"
                };
                await roleManager.CreateAsync(role);
            }

            var rootAdminRoleId5 = Guid.Parse("76822012-bb5b-4a95-85dd-6a848bb6e30f");
            if (!await roleManager.RoleExistsAsync("Examiner"))
            {
                var role = new AppRole
                {
                    Id = rootAdminRoleId5,
                    Name = "Examiner",
                    NormalizedName = "EXAMINER"
                };
                await roleManager.CreateAsync(role);
            }



            if (await userManager.FindByNameAsync("sysadmin@gmail.com") == null)
            {
                var user1 = new AppUser
                {
                    Id = Guid.Parse("4c9b6736-0064-4381-b455-397110f5d005"),
                    FirstName = "IT1",
                    LastName = "UDA1",
                    UserName = "sysadmin@gmail.com",
                    Email = "sysadmin@gmail.com",
                    Avatar = "/uploads/users/avatar.png",
                    NormalizedUserName = "SYSADMIN@GMAIL.COM",
                    NormalizedEmail = "SYSADMIN@GMAIL.COM",
                    EmailConfirmed = true,               
                    IsActive = true,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    LockoutEnabled = false,
                    CreatedAt = DateTime.Now
                };
                var result = await userManager.CreateAsync(user1, "__SEED_USER_PASSWORD__");

                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user1, "SysAdmin");
                }
                else
                {
                    throw new Exception("Cannot create SysAdmin: " + string.Join("; ", result.Errors.Select(e => e.Description)));
                }
            }
            if (await userManager.FindByNameAsync("admin@gmail.com") == null)
            {
                var user2 = new AppUser
                {
                    Id = Guid.Parse("4c9b6736-0064-4381-b455-397110f5d001"),
                    FirstName = "IT2",
                    LastName = "UDA2",
                    UserName = "admin@gmail.com",
                    Email = "admin@gmail.com",
                    Avatar = "/uploads/users/avatar.png",
                    NormalizedUserName = "ADMIN@GMAIL.COM",
                    NormalizedEmail = "ADMIN@GMAIL.COM",
                    EmailConfirmed = true,
                    IsActive = true,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    LockoutEnabled = false,
                    CreatedAt = DateTime.Now
                };

                var result = await userManager.CreateAsync(user2, "__SEED_USER_PASSWORD__");


                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user2, "admin");
                }
                else
                {
                    throw new Exception("Cannot create admin user: " + string.Join("; ", result.Errors.Select(e => e.Description)));
                }
            }

            if (await userManager.FindByNameAsync("teacher@gmail.com") == null)
            {
                var user3 = new AppUser
                {
                    Id = Guid.Parse("4c9b6736-0064-4381-b455-397110f5d002"),
                    FirstName = "IT3",
                    LastName = "UDA3",
                    UserName = "teacher@gmail.com",                 
                    Email = "teacher@gmail.com",
                    Avatar = "/uploads/users/avatar.png",
                    NormalizedUserName = "TEACHER@GMAIL.COM",
                    NormalizedEmail = "TEACHER@GMAIL.COM",
                    EmailConfirmed = true,
                    IsActive = true,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    LockoutEnabled = false,
                    CreatedAt = DateTime.Now
                };

                var result = await userManager.CreateAsync(user3, "__SEED_USER_PASSWORD__");


                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user3, "Teacher");
                }
                else
                {
                    throw new Exception("Cannot create Teacher user: " + string.Join("; ", result.Errors.Select(e => e.Description)));
                }
            }




            if (await userManager.FindByNameAsync("user@gmail.com") == null)
            {
                var user4 = new AppUser
                {
                    Id = Guid.Parse("4c9b6736-0064-4381-b455-397110f5d004"),
                    FirstName = "IT4",
                    LastName = "UDA4",
                    UserName = "user@gmail.com",
                    Email = "user@gmail.com",
                    Avatar = "/uploads/users/avatar.png",
                    NormalizedUserName = "USER@GMAIL.COM",
                    NormalizedEmail = "USER@GMAIL.COM",
                    EmailConfirmed = true,
                    IsActive = true,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    LockoutEnabled = false,
                    CreatedAt = DateTime.Now
                };
                var result = await userManager.CreateAsync(user4, "__SEED_USER_PASSWORD__");

                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user4, "User");
                }
                else
                {
                    throw new Exception("Cannot create User: " + string.Join("; ", result.Errors.Select(e => e.Description)));
                }
            }

            if (await userManager.FindByNameAsync("examiner@gmail.com") == null)
            {
                var user5 = new AppUser
                {
                    Id = Guid.Parse("4c9b6736-0064-4381-b455-397118f5d003"),
                    FirstName = "IT5",
                    LastName = "UDA5",
                    UserName = "examiner@gmail.com",
                    Email = "examiner@gmail.com",
                    Avatar = "/uploads/users/avatar.png",
                    NormalizedUserName = "EXAMINER@GMAIL.COM",
                    NormalizedEmail = "EXAMINER@GMAIL.COM",
                    EmailConfirmed = true,
                    IsActive = true,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    LockoutEnabled = false,
                    CreatedAt = DateTime.Now
                };
                var result = await userManager.CreateAsync(user5, "__SEED_USER_PASSWORD__");

                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user5, "Examiner");
                }
                else
                {
                    throw new Exception("Cannot create User: " + string.Join("; ", result.Errors.Select(e => e.Description)));
                }
            }

            await SeedStudentsAsync(context);
        }

        private static async Task SeedStudentsAsync(ApplicationDbContext context)
        {
            if (await context.Students.AnyAsync())
            {
                return;
            }

            context.Students.AddRange(
                new Student
                {
                    Id = Guid.Parse("aaaaaaaa-1111-4111-8111-111111111111"),
                    StudentCode = "SV2026001",
                    FullName = "Nguyễn Văn An",
                    Email = "an.nguyen@school.edu.vn",
                    Phone = "0901234567",
                    DateOfBirth = new DateOnly(2004, 5, 12),
                    Gender = StudentGender.MALE,
                    ClassId = 1,
                    ClassName = "CNTT01",
                    Status = StudentStatus.ACTIVE
                },
                new Student
                {
                    Id = Guid.Parse("aaaaaaaa-2222-4222-8222-222222222222"),
                    StudentCode = "SV2026002",
                    FullName = "Trần Thị Bình",
                    Email = "binh.tran@school.edu.vn",
                    Phone = "0912345678",
                    DateOfBirth = new DateOnly(2005, 1, 20),
                    Gender = StudentGender.FEMALE,
                    ClassId = 1,
                    ClassName = "CNTT01",
                    Status = StudentStatus.ACTIVE
                },
                new Student
                {
                    Id = Guid.Parse("aaaaaaaa-3333-4333-8333-333333333333"),
                    StudentCode = "SV2026003",
                    FullName = "Lê Hoàng Nam",
                    Email = "nam.le@school.edu.vn",
                    Phone = "0987654321",
                    DateOfBirth = new DateOnly(2003, 11, 3),
                    Gender = StudentGender.MALE,
                    ClassId = 2,
                    ClassName = "CNTT02",
                    Status = StudentStatus.SUSPENDED
                }
            );

            await context.SaveChangesAsync();
        }
    }
}
