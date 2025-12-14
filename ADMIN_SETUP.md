# Admin System - Hardcoded Permanent Admin

## 🔐 Permanent Admin

**Email:** `kirankumar07112003@gmail.com`

This email is **hardcoded as the permanent admin** and cannot be changed by anyone.

## Role Hierarchy

```
Admin (Head User)          ← Only kirankumar07112003@gmail.com
  ↓
Super User (Faculty)       ← Can be assigned by Admin
  ↓
Normal User (Student)      ← Default role for new users
```

## How It Works

### Automatic Admin Assignment

When `kirankumar07112003@gmail.com` signs in:
1. ✅ Automatically assigned **admin** role
2. ✅ Marked as `isHardcodedAdmin: true` in Firestore
3. ✅ Role **cannot be changed** by anyone (protected in code + Firestore rules)

### Role Assignment by Admin

The admin can assign roles to other users:
- **Faculty (Super User)**: Full access to teaching tools
- **Student (Normal User)**: Read-only access to their own data

### Security Protection

**Firestore Rules:**
- ✅ Hardcoded admin role is **immutable**
- ✅ Only admin can change other users' roles
- ✅ Users cannot change their own roles
- ✅ The `isHardcodedAdmin` flag cannot be modified

**Code Protection:**
- ✅ Admin email is checked on **every login**
- ✅ Admin role is **forced** even if database is manually edited
- ✅ Profile updates always enforce admin status

## Testing

1. **Sign in as Admin:**
   - Email: `kirankumar07112003@gmail.com`
   - Method: Google Sign-In
   - Expected: Automatically become admin

2. **Verify Admin Access:**
   - See all user management options
   - Access to all modules (Timetable, Students, Questions, Chatbot)
   - Can assign roles to other users

3. **Try to Change Admin Role (Should Fail):**
   - Even manually editing Firestore won't work
   - System auto-corrects on next login

## User Role Structure in Firestore

```javascript
{
  uid: "user_unique_id",
  email: "kirankumar07112003@gmail.com",
  role: "admin",
  isHardcodedAdmin: true,  // Only for permanent admin
  displayName: "User Name",
  createdAt: "2024-12-14...",
  lastLogin: "2024-12-14..."
}
```

## Future: Adding More Admins (If Needed)

If you need to add more permanent admins in the future:

1. **Edit `AuthContext.jsx`** (line 47-48):
```javascript
const ADMIN_EMAILS = [
  'kirankumar07112003@gmail.com',
  'another-admin@gmail.com'  // Add here
];
const isHardcodedAdmin = ADMIN_EMAILS.includes(user.email);
```

2. **Deploy updated code**
3. **Those emails will become permanent admins**

---

**Remember:** Only sign in with `kirankumar07112003@gmail.com` for full admin access! 🔐
