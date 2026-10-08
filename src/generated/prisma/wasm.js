
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  password: 'password',
  phone: 'phone',
  role: 'role',
  bio: 'bio',
  skills: 'skills',
  interests: 'interests',
  avatar: 'avatar',
  location: 'location',
  website: 'website',
  githubUrl: 'githubUrl',
  linkedinUrl: 'linkedinUrl',
  resumeUrl: 'resumeUrl',
  resumeFileName: 'resumeFileName',
  resumeUploadedAt: 'resumeUploadedAt',
  availabilityStatus: 'availabilityStatus',
  availabilityHoursPerWeek: 'availabilityHoursPerWeek',
  workPreference: 'workPreference',
  noticePeriod: 'noticePeriod',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EducationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  institution: 'institution',
  degree: 'degree',
  fieldOfStudy: 'fieldOfStudy',
  startDate: 'startDate',
  endDate: 'endDate',
  isCurrent: 'isCurrent',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExperienceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  company: 'company',
  location: 'location',
  startDate: 'startDate',
  endDate: 'endDate',
  isCurrent: 'isCurrent',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PortfolioItemScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  projectUrl: 'projectUrl',
  githubUrl: 'githubUrl',
  imageUrl: 'imageUrl',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  userId: 'userId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  userId: 'userId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.StartupIdeaScalarFieldEnum = {
  id: 'id',
  founderId: 'founderId',
  title: 'title',
  tagline: 'tagline',
  description: 'description',
  category: 'category',
  stage: 'stage',
  requiredSkills: 'requiredSkills',
  targetMarket: 'targetMarket',
  websiteUrl: 'websiteUrl',
  pitchDeckUrl: 'pitchDeckUrl',
  teamSize: 'teamSize',
  isActive: 'isActive',
  isVerified: 'isVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamApplicationScalarFieldEnum = {
  id: 'id',
  startupIdeaId: 'startupIdeaId',
  candidateId: 'candidateId',
  roleApplied: 'roleApplied',
  pitchMessage: 'pitchMessage',
  skills: 'skills',
  availabilityHoursPerWeek: 'availabilityHoursPerWeek',
  portfolioUrl: 'portfolioUrl',
  resumeUrl: 'resumeUrl',
  status: 'status',
  founderFeedback: 'founderFeedback',
  reviewedAt: 'reviewedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  link: 'link',
  isRead: 'isRead',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StartupNoteScalarFieldEnum = {
  id: 'id',
  startupIdeaId: 'startupIdeaId',
  authorId: 'authorId',
  title: 'title',
  content: 'content',
  color: 'color',
  isPinned: 'isPinned',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StartupAnnouncementScalarFieldEnum = {
  id: 'id',
  startupIdeaId: 'startupIdeaId',
  authorId: 'authorId',
  title: 'title',
  content: 'content',
  priority: 'priority',
  isPinned: 'isPinned',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StartupFileScalarFieldEnum = {
  id: 'id',
  startupIdeaId: 'startupIdeaId',
  uploaderId: 'uploaderId',
  fileName: 'fileName',
  fileUrl: 'fileUrl',
  fileSize: 'fileSize',
  fileType: 'fileType',
  category: 'category',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  startupIdeaId: 'startupIdeaId',
  creatorId: 'creatorId',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  deadline: 'deadline',
  progress: 'progress',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskAssigneeScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  userId: 'userId',
  assignedAt: 'assignedAt'
};

exports.Prisma.InvestorFavoriteScalarFieldEnum = {
  id: 'id',
  investorId: 'investorId',
  startupIdeaId: 'startupIdeaId',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.ReportScalarFieldEnum = {
  id: 'id',
  reporterId: 'reporterId',
  targetId: 'targetId',
  targetType: 'targetType',
  reason: 'reason',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Role = exports.$Enums.Role = {
  FOUNDER: 'FOUNDER',
  DEVELOPER: 'DEVELOPER',
  DESIGNER: 'DESIGNER',
  INVESTOR: 'INVESTOR',
  MENTOR: 'MENTOR',
  ADMIN: 'ADMIN'
};

exports.AvailabilityStatus = exports.$Enums.AvailabilityStatus = {
  AVAILABLE_FULLTIME: 'AVAILABLE_FULLTIME',
  AVAILABLE_PARTTIME: 'AVAILABLE_PARTTIME',
  CONTRACT: 'CONTRACT',
  OPEN_TO_OFFERS: 'OPEN_TO_OFFERS',
  NOT_AVAILABLE: 'NOT_AVAILABLE'
};

exports.WorkPreference = exports.$Enums.WorkPreference = {
  REMOTE: 'REMOTE',
  HYBRID: 'HYBRID',
  ONSITE: 'ONSITE',
  ANY: 'ANY'
};

exports.StartupStage = exports.$Enums.StartupStage = {
  IDEATION: 'IDEATION',
  PROTOTYPE: 'PROTOTYPE',
  MVP: 'MVP',
  EARLY_TRACTION: 'EARLY_TRACTION',
  SCALING: 'SCALING'
};

exports.ApplicationStatus = exports.$Enums.ApplicationStatus = {
  PENDING: 'PENDING',
  REVIEWING: 'REVIEWING',
  SHORTLISTED: 'SHORTLISTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN'
};

exports.TaskStatus = exports.$Enums.TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

exports.TaskPriority = exports.$Enums.TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.Prisma.ModelName = {
  User: 'User',
  Education: 'Education',
  Experience: 'Experience',
  PortfolioItem: 'PortfolioItem',
  RefreshToken: 'RefreshToken',
  PasswordResetToken: 'PasswordResetToken',
  StartupIdea: 'StartupIdea',
  TeamApplication: 'TeamApplication',
  Notification: 'Notification',
  StartupNote: 'StartupNote',
  StartupAnnouncement: 'StartupAnnouncement',
  StartupFile: 'StartupFile',
  Task: 'Task',
  TaskAssignee: 'TaskAssignee',
  InvestorFavorite: 'InvestorFavorite',
  Report: 'Report'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
