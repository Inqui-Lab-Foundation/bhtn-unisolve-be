import { Request, Response, NextFunction } from "express";
import { mentor } from "../models/mentor.model";
import { organization } from "../models/organization.model";
import TranslationService from "../services/translation.service";
import dispatcher from "../utils/dispatch.util";
import db from "../utils/dbconnection.util"
import { courseModuleSchema, courseModuleUpdateSchema } from "../validations/courseModule.validationa";
import { translationSchema, translationUpdateSchema } from "../validations/translation.validations";
import ValidationsHolder from "../validations/validationHolder";
import { quiz_survey_response } from '../models/quiz_survey_response.model';
import BaseController from "./base.controller";
import { constents } from "../configs/constents.config";
import { mentor_course_topic } from "../models/mentor_course_topic.model";
import { internal, notFound } from "boom";
import { speeches } from "../configs/speeches.config";
import ReportService from "../services/report.service";
import { Op, QueryTypes } from 'sequelize';
import { user } from "../models/user.model";
import { team } from "../models/team.model";

export default class ReportController extends BaseController {

    model = "mentor"; ///giving any name because this shouldnt be used in any apis in this controller

    protected initializePath(): void {
        this.path = '/reports';
    }
    protected initializeValidations(): void {
        // this.validations =  new ValidationsHolder(translationSchema,translationUpdateSchema);
    }
    protected initializeRoutes(): void {
        //example route to add 
        this.router.get(`${this.path}/allMentorReports`, this.getAllMentorReports.bind(this));
        this.router.get(`${this.path}/mentorRegList`, this.getMentorRegList.bind(this));
        this.router.get(this.path + "/preSurvey", this.mentorPreSurvey.bind(this));
        this.router.get(this.path + "/courseComplete", this.courseComplete.bind(this));
        this.router.get(this.path + "/courseInComplete", this.courseInComplete.bind(this));
        this.router.get(this.path + "/notRegistered", this.notRegistered.bind(this));
        this.router.get(this.path + "/notRegister", this.notRegistered.bind(this));
        this.router.get(this.path + "/userTopicProgress", this.userTopicProgressGroupByCourseTopicId.bind(this));
        this.router.get(this.path + "/mentorTeamsStudents", this.teamRegistered.bind(this));
        this.router.get(this.path + "/challengesCount", this.challengesLevelCount.bind(this));
        this.router.get(this.path + "/challengesDistrictCount", this.districtWiseChallengesCount.bind(this));
        this.router.get(this.path + "/mentorsummary", this.mentorsummary.bind(this));
        this.router.get(`${this.path}/studentdetailsreport`, this.getstudentDetailsreport.bind(this));
        this.router.get(`${this.path}/mentordetailsreport`, this.getmentorDetailsreport.bind(this));
        this.router.get(`${this.path}/mentordetailstable`, this.getmentorDetailstable.bind(this));
        this.router.get(`${this.path}/studentdetailstable`, this.getstudentDetailstable.bind(this));
        this.router.get(`${this.path}/ideadeatilreport`, this.getideaReport.bind(this));
        this.router.get(`${this.path}/ideaReportTable`, this.getideaReportTable.bind(this));
        // super.initializeRoutes();
    }

    protected async getMentorRegList(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { quiz_survey_id } = req.params
            const { page, size, status, district, organization_type } = req.query;
            let condition = {}
            // condition = status ? { status: { [Op.like]: `%${status}%` } } : null;
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(this.model).catch(error => {
                next(error)
            });
            const paramStatus: any = req.query.status;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    addWhereClauseStatusPart = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    addWhereClauseStatusPart = true;
                }
            } else {
                whereClauseStatusPart = { "status": "ACTIVE" };
                addWhereClauseStatusPart = true;
            }
            let districtFilter: any = {}
            if (district !== 'All Districts' && organization_type !== 'All Categorys') {
                districtFilter = { organization_type, district, status }
            } else if (district !== 'All Districts') {
                districtFilter = { district, status }
            } else if (organization_type !== 'All Categorys') {
                districtFilter = { organization_type, status }
            } else {
                districtFilter = { status }
            }
            const mentorsResult = await mentor.findAll({
                attributes: [
                    "full_name"
                ],
                raw: true,
                where: {
                    [Op.and]: [
                        whereClauseStatusPart,
                        condition
                    ]
                },
                include: [
                    {
                        where: districtFilter,
                        model: organization,
                        attributes: [
                            "organization_code",
                            "organization_name",
                            "organization_type",
                            "district",
                            "city",
                            "principal_name",
                            "principal_mobile"
                        ]
                    },
                    {
                        model: user,
                        attributes: [
                            "username",
                            "user_id"
                        ]
                    }
                ],
                limit, offset
            });
            if (!mentorsResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (mentorsResult instanceof Error) {
                throw mentorsResult
            }
            res.status(200).send(dispatcher(res, mentorsResult, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async mentorPreSurvey(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { quiz_survey_id } = req.params
            const { page, size, role } = req.query;
            let condition = role ? role : 'MENTOR';
            // let condition = role ? { role: { [Op.eq]: role } } : null;
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(this.model).catch(error => {
                next(error)
            });
            const paramStatus: any = req.query.status;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    addWhereClauseStatusPart = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    addWhereClauseStatusPart = true;
                }
            } else {
                whereClauseStatusPart = { "status": "ACTIVE" };
                addWhereClauseStatusPart = true;
            }
            const mentorsResult = await quiz_survey_response.findAll({
                attributes: [
                    "quiz_response_id",
                    "updated_at"
                ],
                raw: true,
                where: {
                    [Op.and]: [
                        whereClauseStatusPart
                    ]
                },
                include: [
                    {
                        model: user,
                        attributes: [
                            "full_name",
                            "created_at",
                            "updated_at"
                        ],
                        where: { role: condition }
                    }
                ],
                limit, offset
            });
            if (!mentorsResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (mentorsResult instanceof Error) {
                throw mentorsResult
            }
            res.status(200).send(dispatcher(res, mentorsResult, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async courseComplete(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { quiz_survey_id } = req.params
            const { page, size, role } = req.query;
            let condition = role ? { role: { [Op.eq]: role } } : null;
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(this.model).catch(error => {
                next(error)
            });
            const paramStatus: any = req.query.status;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    addWhereClauseStatusPart = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    addWhereClauseStatusPart = true;
                }
            } else {
                whereClauseStatusPart = { "status": "ACTIVE" };
                addWhereClauseStatusPart = true;
            }
            const mentorsResult = await db.query("SELECT mentors.organization_code, mentors.district, mentors.full_name,(SELECT COUNT(mentor_topic_progress_id)FROM mentor_topic_progress AS mentor_progress WHERE mentor_progress.user_id=mentors.user_id) AS 'count' FROM mentors LEFT OUTER JOIN mentor_topic_progress AS mentor_progress ON mentors.user_id=mentor_progress.user_id where (SELECT COUNT(mentor_topic_progress_id)FROM mentor_topic_progress AS mentor_progress WHERE mentor_progress.user_id=mentors.user_id)= 9 GROUP BY mentor_progress.user_id", { type: QueryTypes.SELECT });
            if (!mentorsResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (mentorsResult instanceof Error) {
                throw mentorsResult
            }
            res.status(200).send(dispatcher(res, mentorsResult, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async courseInComplete(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { quiz_survey_id } = req.params
            const { page, size, role } = req.query;
            let condition = role ? { role: { [Op.eq]: role } } : null;
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(this.model).catch(error => {
                next(error)
            });
            const paramStatus: any = req.query.status;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                whereClauseStatusPart = { "status": paramStatus }
                whereClauseStatusPartLiteral = `status = "${paramStatus}"`
                addWhereClauseStatusPart = true;
            }
            const mentorsResult = await db.query("SELECT mentors.organization_code, mentors.district, mentors.full_name,(SELECT COUNT(mentor_topic_progress_id)FROM mentor_topic_progress AS mentor_progress WHERE mentor_progress.user_id=mentors.user_id) AS 'count' FROM mentors LEFT OUTER JOIN mentor_topic_progress AS mentor_progress ON mentors.user_id=mentor_progress.user_id where (SELECT COUNT(mentor_topic_progress_id)FROM mentor_topic_progress AS mentor_progress WHERE mentor_progress.user_id=mentors.user_id) != 9 GROUP BY mentor_progress.user_id", { type: QueryTypes.SELECT });
            console.log(mentorsResult);
            if (!mentorsResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (mentorsResult instanceof Error) {
                throw mentorsResult
            }
            res.status(200).send(dispatcher(res, mentorsResult, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async notRegistered(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { quiz_survey_id } = req.params
            const { page, size, role, district, organization_type } = req.query;
            let condition = role ? { role: { [Op.eq]: role } } : null;
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(this.model).catch(error => {
                next(error)
            });
            const paramStatus: any = req.query.status;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                whereClauseStatusPart = { "status": paramStatus }
                whereClauseStatusPartLiteral = `status = "${paramStatus}"`
                addWhereClauseStatusPart = true;
            }
            let districtFilter: any = ''
            let categoryFilter: any = ''
            if (district !== 'All Districts' && organization_type !== 'All Categorys') {
                districtFilter = `'${district}'`
                categoryFilter = `'${organization_type}'`
            } else if (district !== 'All Districts') {
                districtFilter = `'${district}'`
                categoryFilter = `'%%'`
            } else if (organization_type !== 'All Categorys') {
                categoryFilter = `'${organization_type}'`
                districtFilter = `'%%'`
            } else {
                districtFilter = `'%%'`
                categoryFilter = `'%%'`
            }
            const mentorsResult = await db.query(`SELECT 
            organization_id,
            organization_code,
            organization_name,
            district,
            organization_type,
            city,
            state,
            country,
            principal_name,
            principal_mobile,
            principal_email FROM organizations WHERE status='ACTIVE' && district LIKE ${districtFilter} && organization_type LIKE ${categoryFilter} && NOT EXISTS(SELECT mentors.organization_code  from mentors WHERE organizations.organization_code = mentors.organization_code) `, { type: QueryTypes.SELECT });
            if (!mentorsResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (mentorsResult instanceof Error) {
                throw mentorsResult
            }
            res.status(200).send(dispatcher(res, mentorsResult, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async userTopicProgressGroupByCourseTopicId(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const mentorsResult = await db.query("SELECT course_topic_id, count(user_id) as count FROM user_topic_progress group by course_topic_id", { type: QueryTypes.SELECT });
            if (!mentorsResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (mentorsResult instanceof Error) {
                throw mentorsResult
            }
            res.status(200).send(dispatcher(res, mentorsResult, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async teamRegistered(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { quiz_survey_id } = req.params
            const { page, size, role } = req.query;
            let condition = role ? role : 'MENTOR';
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(this.model).catch(error => {
                next(error)
            });
            const paramStatus: any = req.query.status;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    addWhereClauseStatusPart = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    addWhereClauseStatusPart = true;
                }
            } else {
                whereClauseStatusPart = { "status": "ACTIVE" };
                addWhereClauseStatusPart = true;
            }
            const teamResult = await mentor.findAll({
                attributes: [
                    "full_name",
                    "mentor_id",
                    [
                        db.literal(`(
                            SELECT COUNT(*)
                            FROM teams AS t
                            WHERE t.mentor_id = \`mentor\`.\`mentor_id\`)`), 'Team_count'
                    ],
                ],
                raw: true,
                where: {
                    [Op.and]: [
                        whereClauseStatusPart
                    ]
                },
                group: ['mentor_id'],
                include: [
                    {
                        model: team,
                        attributes: [
                            "team_id",
                            "team_name",
                            [
                                db.literal(`(
                            SELECT COUNT(*)
                            FROM students AS s
                            WHERE s.team_id = \`team\`.\`team_id\`)`), 'student_count'
                            ],

                        ]
                    },
                    {
                        model: organization,
                        attributes: [
                            "organization_code",
                            "organization_name",
                            "district"
                        ]
                    }
                ], limit, offset
            });
            if (!teamResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (teamResult instanceof Error) {
                throw teamResult
            }
            res.status(200).send(dispatcher(res, teamResult, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async challengesLevelCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { quiz_survey_id } = req.params
            const { page, size, role } = req.query;
            let condition = role ? { role: { [Op.eq]: role } } : null;
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(this.model).catch(error => {
                next(error)
            });
            const paramStatus: any = req.query.status;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    addWhereClauseStatusPart = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    addWhereClauseStatusPart = true;
                }
            } else {
                whereClauseStatusPart = { "status": "ACTIVE" };
                addWhereClauseStatusPart = true;
            }
            const challengesLevels = await db.query("select status, evaluation_status, count(team_id) AS team_count from challenge_responses group by status, evaluation_status", { type: QueryTypes.SELECT });
            if (!challengesLevels) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (challengesLevels instanceof Error) {
                throw challengesLevels
            }
            res.status(200).send(dispatcher(res, challengesLevels, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async districtWiseChallengesCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let challenges: any
            let level = req.query.level;
            if (level && typeof level == 'string') {
                switch (level) {
                    case 'DRAFT': challenges = await db.query("SELECT district, count(challenge_response_id) as count FROM unisolve_db.challenge_responses WHERE status = 'DRAFT' group by district", { type: QueryTypes.SELECT });
                        break;
                    case 'SUBMITTED': challenges = await db.query("SELECT district, count(challenge_response_id) as count FROM unisolve_db.challenge_responses WHERE status = 'SUBMITTED' group by district", { type: QueryTypes.SELECT });
                        break;
                    case 'L1YETPROCESSED': challenges = await db.query("SELECT count(challenge_response_id) as count, district FROM unisolve_db.challenge_responses WHERE evaluation_status is null group by district ", { type: QueryTypes.SELECT });
                        break;
                    case 'SELECTEDROUND1': challenges = await db.query("SELECT count(challenge_response_id) as count, district FROM unisolve_db.challenge_responses WHERE evaluation_status = 'SELECTEDROUND1' group by district", { type: QueryTypes.SELECT });
                        break;
                    case 'REJECTEDROUND1': challenges = await db.query("SELECT count(challenge_response_id) as count, district FROM unisolve_db.challenge_responses WHERE evaluation_status = 'REJECTEDROUND1' group by district ", { type: QueryTypes.SELECT });
                        break;
                    case 'L2PROCESSED': challenges = await db.query("SELECT COUNT(challenge_response_id) AS count, district FROM unisolve_db.challenge_responses WHERE challenge_response_id IN(SELECT challenge_response_id FROM unisolve_db.evaluator_ratings GROUP BY challenge_response_id HAVING COUNT(challenge_response_id) > 2) GROUP BY district", { type: QueryTypes.SELECT });
                        break;
                    case 'L2YETPROCESSED': challenges = await db.query("SELECT count(challenge_response_id) as count, district FROM unisolve_db.l1_accepted group by district; ", { type: QueryTypes.SELECT });
                        break;
                    case 'FINALCHALLENGES': challenges = await db.query("SELECT district, COUNT(challenge_response_id) AS count FROM unisolve_db.challenge_responses WHERE challenge_response_id in (SELECT challenge_response_id FROM unisolve_db.evaluation_results);", { type: QueryTypes.SELECT });
                        break;
                    case 'FINALACCEPTED': challenges = await db.query("SELECT district, count(challenge_response_id) as count FROM unisolve_db.challenge_responses WHERE final_result = '1' group by district ", { type: QueryTypes.SELECT });
                        break;
                    case 'FINALREJECTED': challenges = await db.query("SELECT district, count(challenge_response_id) as count FROM unisolve_db.challenge_responses WHERE final_result = '0' group by district ", { type: QueryTypes.SELECT });
                        break;
                }
            }
            if (!challenges) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (challenges instanceof Error) {
                throw challenges
            }
            res.status(200).send(dispatcher(res, challenges, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async getAllMentorReports(req: Request, res: Response, next: NextFunction) {
        try {

            let tr: any = req.query.tr;
            let tpre: any = req.query.tpre;
            let tc: any = req.query.tc;
            let tpost: any = req.query.tpost;
            let rs: any = req.query.rs;
            let dis: any = req.query.dis;

            if (!rs ||
                !(rs in constents.reports_all_ment_reports_rs_flags.list)) {
                rs = "ALL"
            }
            let attrToBeInCluded: any = [
                "user_id"
            ]
            let totalNoOfTopics = 9
            if (tpre && tpre > 0) {
                attrToBeInCluded.push(
                    [
                        // Note the wrapping parentheses in the call below!
                        //hard coded pre survey quiz id for mentor 
                        db.literal(`(
                            SELECT 
                                CASE WHEN EXISTS
                                    (
                                        SELECT qsr.user_id 
                                        FROM quiz_survey_responses as qsr 
                                        WHERE qsr.user_id = \`mentor\`.\`user_id\`
                                        AND qsr.quiz_survey_id= 1 
                                    )
                                THEN  
                                    (
                                        SELECT created_at 
                                        FROM quiz_survey_responses as qsr 
                                        WHERE qsr.user_id = \`mentor\`.\`user_id\`
                                        AND qsr.quiz_survey_id= 1 
                                    )
                                ELSE 
                                    "INCOMPLETE"
                            END as pre_survey_status
                        )`),
                        'pre_survey_status'
                    ],
                )
            }

            if (tpost && tpost > 0) {
                attrToBeInCluded.push(
                    [
                        // Note the wrapping parentheses in the call below!
                        //hard coded post survey quiz id for mentor 
                        db.literal(`(
                            SELECT CASE 
                                WHEN EXISTS
                                    (
                                        SELECT qsr.user_id 
                                        FROM quiz_survey_responses as qsr 
                                        WHERE qsr.user_id = \`mentor\`.\`user_id\`
                                        AND qsr.quiz_survey_id= 3 
                                    )
                                THEN  
                                    (
                                        SELECT created_at 
                                        FROM quiz_survey_responses as qsr 
                                        WHERE qsr.user_id = \`mentor\`.\`user_id\`
                                        AND qsr.quiz_survey_id= 3 
                                    )
                                ELSE 
                                    "INCOMPLETE"
                            END as post_survey_status
                        )`),
                        'post_survey_status'
                    ],
                )
            }

            if (tc && tc > 0) {
                const allMentorTopicsResult = await mentor_course_topic.findAll({
                    where: {
                        status: "ACTIVE"
                    },
                    raw: true,
                })

                if (!allMentorTopicsResult) {
                    throw internal(speeches.INTERNAL)
                }
                if (allMentorTopicsResult instanceof Error) {
                    throw allMentorTopicsResult
                }
                if (!allMentorTopicsResult.length) {
                    throw internal(speeches.INTERNAL)
                }
                totalNoOfTopics = allMentorTopicsResult.length

                attrToBeInCluded.push(
                    [
                        // Note the wrapping parentheses in the call below!
                        //hard coded pre survey quiz id for mentor 
                        db.literal(`(
                            SELECT CASE 
                            WHEN  
                                (SELECT count(user_id)
                                FROM mentor_topic_progress as mtp 
                                WHERE mtp.user_id = \`mentor\`.\`user_id\`
                                ) >= ${totalNoOfTopics}
                            THEN  
                                "COMPLETED"
                            WHEN  
                                (SELECT count(user_id)
                                FROM mentor_topic_progress as mtp 
                                WHERE mtp.user_id = \`mentor\`.\`user_id\`
                                ) < ${totalNoOfTopics} 
                                AND 
                                (SELECT count(user_id)
                                FROM mentor_topic_progress as mtp 
                                WHERE mtp.user_id = \`mentor\`.\`user_id\`
                                ) > 0 
                            THEN  
                                "INPROGRESS"
                            ELSE 
                                "INCOMPLETE"
                            END as course_status
                        )`),
                        'course_status'
                    ],
                )
            }
            let disBasedWhereClause: any = {}
            if (dis) {
                dis = dis.trim()
                disBasedWhereClause = {
                    district: dis
                }
            }

            const reportservice = new ReportService();
            let rsBasedWhereClause: any = {}
            rsBasedWhereClause = await reportservice.fetchOrgCodeArrToIncInAllMentorReportBasedOnReportStatusParam(
                tr, tpre, tc, tpost, rs, totalNoOfTopics
            )

            //actual query being called here ...this result is to be returned...!!
            const organisationsResult: any = await organization.findAll({
                include: [
                    {
                        model: mentor,
                        attributes: {
                            include: attrToBeInCluded
                        },
                        include: [
                            { model: user }
                        ]
                    }
                ],
                where: {
                    [Op.and]: [
                        rsBasedWhereClause,
                        disBasedWhereClause
                    ]
                },
            })

            if (!organisationsResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (organisationsResult instanceof Error) {
                throw organisationsResult
            }

            res.status(200).send(dispatcher(res, organisationsResult, 'success'));
        } catch (err) {
            next(err)
        }
    }
    protected async mentorsummary(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let data: any = {}
            const district = req.query.district;
            let summary
            if (district) {
                summary = await db.query(`SELECT 
                org.district,
                org.organization_count,
                org.uniqueRegSchools,
                org.total_registered_teachers,
                org.organization_count - (org.uniqueRegSchools) AS total_not_registered_teachers
            FROM
                (SELECT 
                    o.district,
                        COUNT(DISTINCT o.organization_id) AS organization_count,
                        COUNT(DISTINCT m.organization_code) AS uniqueRegSchools,
                        COUNT(m.mentor_id) AS total_registered_teachers
                FROM
                    organizations o
                LEFT JOIN mentors m ON o.organization_code = m.organization_code
                WHERE
                    o.status = 'ACTIVE'  && o.district = '${district}'
                GROUP BY o.district) AS org `, { type: QueryTypes.SELECT });

            } else {
                summary = await db.query(`SELECT 
            org.district,
            org.organization_count,
            org.uniqueRegSchools,
            org.total_registered_teachers,
            org.organization_count - (org.uniqueRegSchools) AS total_not_registered_teachers
        FROM
            (SELECT 
                o.district,
                    COUNT(DISTINCT o.organization_id) AS organization_count,
                    COUNT(DISTINCT m.organization_code) AS uniqueRegSchools,
                    COUNT(m.mentor_id) AS total_registered_teachers
            FROM
                organizations o
            LEFT JOIN mentors m ON o.organization_code = m.organization_code
            WHERE
                o.status = 'ACTIVE'
            GROUP BY o.district) AS org 
        UNION ALL SELECT 
            'Total',
            SUM(organization_count),
            SUM(uniqueRegSchools),
            SUM(total_registered_teachers),
            SUM(organization_count - uniqueRegSchools)
        FROM
            (SELECT 
                o.district,
                    COUNT(DISTINCT o.organization_id) AS organization_count,
                    COUNT(DISTINCT m.organization_code) AS uniqueRegSchools,
                    COUNT(m.mentor_id) AS total_registered_teachers
            FROM
                organizations o
            LEFT JOIN mentors m ON o.organization_code = m.organization_code
            WHERE
                o.status = 'ACTIVE'
            GROUP BY o.district) AS org;`, { type: QueryTypes.SELECT });
            }
            data = summary;
            if (!data) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (data instanceof Error) {
                throw data
            }
            res.status(200).send(dispatcher(res, data, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async getstudentDetailsreport(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { organization_type, district } = req.query;
            let data: any = {}
            let districtFilter: any = ''
            let categoryFilter: any = ''
            if (district !== 'All Districts' && organization_type !== 'All Categorys') {
                districtFilter = `'${district}'`
                categoryFilter = `'${organization_type}'`
            } else if (district !== 'All Districts') {
                districtFilter = `'${district}'`
                categoryFilter = `'%%'`
            } else if (organization_type !== 'All Categorys') {
                categoryFilter = `'${organization_type}'`
                districtFilter = `'%%'`
            } else {
                districtFilter = `'%%'`
                categoryFilter = `'%%'`
            }
            const summary = await db.query(`SELECT 
            og.organization_code AS 'UDISE code',
            og.organization_name AS 'School Name',
            og.district,
            og.organization_type,
            og.city,
            og.principal_name AS 'HM Name',
            og.principal_mobile AS 'HM Contact',
            mn.full_name AS 'Teacher Name',
            t.team_name AS 'Team Name',
            st.full_name AS 'Student Name',
            (SELECT 
                    username
                FROM
                    users
                WHERE
                    user_id = st.user_id) AS 'Student Username',
            st.Age,
            st.gender,
            st.Grade,
            IFNULL((SELECT 
                            status
                        FROM
                            quiz_survey_responses
                        WHERE
                            quiz_survey_id = 2
                                && user_id = st.user_id),
                    'Not Started') AS 'Pre Survey Status',
            IFNULL((SELECT 
                            status
                        FROM
                            challenge_responses
                        WHERE
                            team_id = st.team_id),
                    'Not Initiated') AS 'Idea Status',
            (SELECT 
                    COUNT(course_topic_id)
                FROM
                    user_topic_progress
                WHERE
                    user_id = st.user_id) AS course_status,
            IFNULL((SELECT 
                            status
                        FROM
                            quiz_survey_responses
                        WHERE
                            quiz_survey_id = 4
                                && user_id = st.user_id),
                    'Not Started') AS 'Post Survey Status'
        FROM
            ((((unisolve_db.students AS st)
            INNER JOIN unisolve_db.teams AS t ON st.team_id = t.team_id)
            INNER JOIN unisolve_db.mentors AS mn ON t.mentor_id = mn.mentor_id)
            INNER JOIN unisolve_db.organizations AS og ON mn.organization_code = og.organization_code)
        WHERE
            og.status = 'ACTIVE' && og.district like ${districtFilter}
            && og.organization_type like ${categoryFilter} order by district,mn.full_name,t.team_name,st.full_name;`, { type: QueryTypes.SELECT });
            data = summary;
            if (!data) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (data instanceof Error) {
                throw data
            }
            res.status(200).send(dispatcher(res, data, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async getmentorDetailsreport(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { organization_type, district } = req.query;
            let data: any = {}
            let districtFilter: any = ''
            let categoryFilter: any = ''
            if (district !== 'All Districts' && organization_type !== 'All Categorys') {
                districtFilter = `'${district}'`
                categoryFilter = `'${organization_type}'`
            } else if (district !== 'All Districts') {
                districtFilter = `'${district}'`
                categoryFilter = `'%%'`
            } else if (organization_type !== 'All Categorys') {
                categoryFilter = `'${organization_type}'`
                districtFilter = `'%%'`
            } else {
                districtFilter = `'%%'`
                categoryFilter = `'%%'`
            }
            const summary = await db.query(`SELECT 
            og.organization_code AS 'UDISE code',
            og.organization_name AS 'School Name',
            og.district,
            og.organization_type,
            og.city,
            og.principal_name AS 'HM Name',
            og.principal_mobile AS 'HM Contact',
            mn.full_name AS 'Teacher Name',
            IFNULL((SELECT 
                            CASE
                                    WHEN status = 'ACTIVE' THEN 'Completed'
                                END
                        FROM
                            quiz_survey_responses
                        WHERE
                            quiz_survey_id = 1
                                && user_id = mn.user_id),
                    'Not Started') AS 'Pre Survey Status',
            (SELECT 
                    CASE
                            WHEN COUNT(mentor_course_topic_id) >= 8 THEN 'Completed'
                            WHEN COUNT(mentor_course_topic_id) = 0 THEN 'Not Started'
                            ELSE 'In Progress'
                        END
                FROM
                    mentor_topic_progress
                WHERE
                    user_id = mn.user_id) AS 'Course Status',
            IFNULL((SELECT 
                            CASE
                                    WHEN status = 'ACTIVE' THEN 'Completed'
                                END
                        FROM
                            quiz_survey_responses
                        WHERE
                            quiz_survey_id = 3
                                && user_id = mn.user_id),
                    'Not Started') AS 'Post Survey Status',
            (SELECT 
                    COUNT(*)
                FROM
                    teams
                WHERE
                    mentor_id = mn.mentor_id) AS team_count,
            (SELECT 
                    COUNT(*)
                FROM
                    teams
                        JOIN
                    students ON teams.team_id = students.team_id
                WHERE
                    mentor_id = mn.mentor_id) AS student_count,
            (SELECT 
                    COUNT(*)
                FROM
                    teams
                        JOIN
                    students ON teams.team_id = students.team_id
                        JOIN
                    quiz_survey_responses ON students.user_id = quiz_survey_responses.user_id
                        AND quiz_survey_id = 2
                WHERE
                    mentor_id = mn.mentor_id) AS preSur_cmp,
            (SELECT 
                    COUNT(*)
                FROM
                    (SELECT 
                        mentor_id, student_id, COUNT(*), students.user_id
                    FROM
                        teams
                    LEFT JOIN students ON teams.team_id = students.team_id
                    JOIN user_topic_progress ON students.user_id = user_topic_progress.user_id
                    WHERE
                        mentor_id = mn.mentor_id
                    GROUP BY student_id
                    HAVING COUNT(*) >= 34) AS total) AS countop,
            (SELECT 
                    COUNT(*)
                FROM
                    (SELECT 
                        mentor_id, student_id, COUNT(*), students.user_id
                    FROM
                        teams
                    LEFT JOIN students ON teams.team_id = students.team_id
                    JOIN user_topic_progress ON students.user_id = user_topic_progress.user_id
                    WHERE
                        mentor_id = mn.mentor_id
                    GROUP BY student_id
                    HAVING COUNT(*) > 0 && COUNT(*) < 34) AS total) AS courseinprogess,
            (SELECT 
                    COUNT(*)
                FROM
                    teams
                        JOIN
                    challenge_responses ON teams.team_id = challenge_responses.team_id
                WHERE
                    mentor_id = mn.mentor_id
                        AND challenge_responses.status = 'SUBMITTED') AS submittedcout,
            (SELECT 
                    COUNT(*)
                FROM
                    teams
                        JOIN
                    challenge_responses ON teams.team_id = challenge_responses.team_id
                WHERE
                    mentor_id = mn.mentor_id
                        AND challenge_responses.status = 'DRAFT') AS draftcout
        FROM
            (mentors AS mn)
                LEFT JOIN
            organizations AS og ON mn.organization_code = og.organization_code
        WHERE
            og.status = 'ACTIVE' && og.district like ${districtFilter}
            && og.organization_type like ${categoryFilter} order by district;`, { type: QueryTypes.SELECT })
            data = summary;
            if (!data) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (data instanceof Error) {
                throw data
            }
            res.status(200).send(dispatcher(res, data, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async getmentorDetailstable(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let data: any = {}
            const district = req.query.district;
            let wherefilter = '';
            if (district) {
                wherefilter = `&& og.district= '${district}'`;
            }
            const Regschool = await db.query(`SELECT 
            og.district, COUNT(DISTINCT mn.organization_code) AS totalRegSchools
        FROM
            organizations AS og
                LEFT JOIN
            mentors AS mn ON og.organization_code = mn.organization_code
            WHERE og.status='ACTIVE' ${wherefilter}
        GROUP BY og.district;`, { type: QueryTypes.SELECT });
            const summary = await db.query(`SELECT 
            og.district, COUNT(mn.mentor_id) AS totalReg
        FROM
            organizations AS og
                LEFT JOIN
            mentors AS mn ON og.organization_code = mn.organization_code
            WHERE og.status='ACTIVE' ${wherefilter}
        GROUP BY og.district;`, { type: QueryTypes.SELECT });
            const teamCount = await db.query(`SELECT 
        og.district, COUNT(t.team_id) AS totalTeams
    FROM
        organizations AS og
            LEFT JOIN
        mentors AS mn ON og.organization_code = mn.organization_code
            INNER JOIN
        teams AS t ON mn.mentor_id = t.mentor_id
        WHERE og.status='ACTIVE' ${wherefilter}
    GROUP BY og.district;`, { type: QueryTypes.SELECT });
            const studentCountDetails = await db.query(`SELECT 
        og.district,
        COUNT(st.student_id) AS totalstudent,
        SUM(CASE
            WHEN st.gender = 'MALE' THEN 1
            ELSE 0
        END) AS male,
        SUM(CASE
            WHEN st.gender = 'FEMALE' THEN 1
            ELSE 0
        END) AS female
    FROM
        organizations AS og
            LEFT JOIN
        mentors AS mn ON og.organization_code = mn.organization_code
            INNER JOIN
        teams AS t ON mn.mentor_id = t.mentor_id
            INNER JOIN
        students AS st ON st.team_id = t.team_id
        WHERE og.status='ACTIVE' ${wherefilter}
    GROUP BY og.district;`, { type: QueryTypes.SELECT });
            const courseINcompleted = await db.query(`select district,count(*) as courseIN from (SELECT 
            district,cou
        FROM
            unisolve_db.organizations AS og
                LEFT JOIN
            (SELECT 
                organization_code, cou
            FROM
                unisolve_db.mentors AS mn
            LEFT JOIN (SELECT 
                user_id, COUNT(*) AS cou
            FROM
                unisolve_db.mentor_topic_progress
            GROUP BY user_id having count(*)<8) AS t ON mn.user_id = t.user_id ) AS c ON c.organization_code = og.organization_code WHERE og.status='ACTIVE' ${wherefilter}
        having cou<8) as final group by district;`, { type: QueryTypes.SELECT });
            const courseCompleted = await db.query(`select district,count(*) as courseCMP from (SELECT 
            district,cou
        FROM
            unisolve_db.organizations AS og
                LEFT JOIN
            (SELECT 
                organization_code, cou
            FROM
                unisolve_db.mentors AS mn
            LEFT JOIN (SELECT 
                user_id, COUNT(*) AS cou
            FROM
                unisolve_db.mentor_topic_progress
            GROUP BY user_id having count(*)>=8) AS t ON mn.user_id = t.user_id ) AS c ON c.organization_code = og.organization_code WHERE og.status='ACTIVE' ${wherefilter}
        having cou>=8) as final group by district`, { type: QueryTypes.SELECT });
            data['summary'] = summary;
            data['Regschool'] = Regschool;
            data['teamCount'] = teamCount;
            data['studentCountDetails'] = studentCountDetails;
            data['courseCompleted'] = courseCompleted;
            data['courseINcompleted'] = courseINcompleted;
            if (!data) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (data instanceof Error) {
                throw data
            }
            res.status(200).send(dispatcher(res, data, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async getstudentDetailstable(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let data: any = {}
            const district = req.query.district;
            let wherefilter = '';
            if (district) {
                wherefilter = `&& og.district= '${district}'`;
            }
            const summary = await db.query(`SELECT 
            og.district, COUNT(t.team_id) AS totalTeams
        FROM
            organizations AS og
                LEFT JOIN
            mentors AS mn ON og.organization_code = mn.organization_code
                LEFT JOIN
            teams AS t ON mn.mentor_id = t.mentor_id
            WHERE og.status='ACTIVE' ${wherefilter}
        GROUP BY og.district;`, { type: QueryTypes.SELECT });
            const studentCountDetails = await db.query(`SELECT 
            og.district,
            COUNT(st.student_id) AS totalstudent
        FROM
            organizations AS og
                LEFT JOIN
            mentors AS mn ON og.organization_code = mn.organization_code
                INNER JOIN
            teams AS t ON mn.mentor_id = t.mentor_id
                INNER JOIN
            students AS st ON st.team_id = t.team_id where og.status = 'ACTIVE' ${wherefilter}
        GROUP BY og.district;`, { type: QueryTypes.SELECT });
            const courseCompleted = await db.query(`SELECT 
            og.district,count(st.student_id) as studentCourseCMP
        FROM
            students AS st
                JOIN
            teams AS te ON st.team_id = te.team_id
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            organizations AS og ON mn.organization_code = og.organization_code
                JOIN
            (SELECT 
                user_id, COUNT(*)
            FROM
                user_topic_progress
            GROUP BY user_id
            HAVING COUNT(*) >= 34) AS temp ON st.user_id = temp.user_id WHERE og.status='ACTIVE' ${wherefilter} group by og.district`, { type: QueryTypes.SELECT });
            const courseINprogesss = await db.query(`SELECT 
            og.district,count(st.student_id) as studentCourseIN
        FROM
            students AS st
                JOIN
            teams AS te ON st.team_id = te.team_id
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            organizations AS og ON mn.organization_code = og.organization_code
                JOIN
            (SELECT 
                user_id, COUNT(*)
            FROM
                user_topic_progress
            GROUP BY user_id
            HAVING COUNT(*) < 34) AS temp ON st.user_id = temp.user_id WHERE og.status='ACTIVE' ${wherefilter} group by og.district`, { type: QueryTypes.SELECT });
            const submittedCount = await db.query(`SELECT 
            og.district,count(te.team_id) as submittedCount
        FROM
            teams AS te
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            organizations AS og ON mn.organization_code = og.organization_code
                JOIN
            (SELECT 
                team_id, status
            FROM
                challenge_responses
            WHERE
                status = 'SUBMITTED') AS temp ON te.team_id = temp.team_id WHERE og.status='ACTIVE' ${wherefilter} group by og.district`, { type: QueryTypes.SELECT });
            const draftCount = await db.query(`SELECT 
            og.district,count(te.team_id) as draftCount
        FROM
            teams AS te
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            organizations AS og ON mn.organization_code = og.organization_code
                JOIN
            (SELECT 
                team_id, status
            FROM
                challenge_responses
            WHERE
                status = 'DRAFT') AS temp ON te.team_id = temp.team_id WHERE og.status='ACTIVE' ${wherefilter} group by og.district`, { type: QueryTypes.SELECT });
            data['summary'] = summary;
            data['studentCountDetails'] = studentCountDetails;
            data['courseCompleted'] = courseCompleted;
            data['courseINprogesss'] = courseINprogesss;
            data['submittedCount'] = submittedCount;
            data['draftCount'] = draftCount;
            if (!data) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (data instanceof Error) {
                throw data
            }
            res.status(200).send(dispatcher(res, data, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async getideaReport(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let data: any = {}
            const { district, sdg, organization_type } = req.query;
            let districtFilter: any = `'%%'`
            let categoryFilter: any = `'%%'`
            let themesFilter: any = `'%%'`
            if (district !== 'All Districts' && district !== undefined) {
                districtFilter = `'${district}'`
            }
            if (organization_type !== 'All Categorys' && organization_type !== undefined) {
                categoryFilter = `'${organization_type}'`
            }
            if (sdg !== 'ALL SDGs' && sdg !== undefined) {
                themesFilter = `'${sdg}'`
            }
            const summary = await db.query(`SELECT 
            organization_code,
            district,
            challenge_response_id,
            organization_name,
            organization_type,
            full_name,
            mobile,
            team_name,
            students_names AS 'Students names',
            sdg,
            response
        FROM
            idea_report
            where status = 'SUBMITTED' && district like ${districtFilter} && sdg like ${themesFilter} && organization_type like ${categoryFilter};`, { type: QueryTypes.SELECT });
            data = summary;
            if (!data) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (data instanceof Error) {
                throw data
            }
            res.status(200).send(dispatcher(res, data, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async getideaReportTable(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let data: any = {}
            const district = req.query.district;
            let wherefilter = '';
            if (district) {
                wherefilter = `WHERE org.district= '${district}'`;
            }
            const summary = await db.query(`SELECT 
            org.district,
    COALESCE(totalSubmited, 0) AS totalSubmited,
    COALESCE(NOPOVERTY, 0) AS NOPOVERTY,
    COALESCE(ZEROHUNGER, 0) AS ZEROHUNGER,
    COALESCE(GOODHEALTHANDWELLBEING, 0) AS GOODHEALTHANDWELLBEING,
    COALESCE(QUALITYEDUCATION, 0) AS QUALITYEDUCATION,
    COALESCE(GENDEREQUALITY, 0) AS GENDEREQUALITY,
    COALESCE(CLEANWATERANDSANITATION, 0) AS CLEANWATERANDSANITATION,
    COALESCE(AFFORDABLEANDCLEANENERGY, 0) AS AFFORDABLEANDCLEANENERGY,
    COALESCE(DECENTWORKANDECONOMICGROWTH, 0) AS DECENTWORKANDECONOMICGROWTH,
    COALESCE(INDUSTRYINNOVATIONANDINFRASTRUCTURE, 0) AS INDUSTRYINNOVATIONANDINFRASTRUCTURE,
    COALESCE(REDUCEDINEQUALITIES, 0) AS REDUCEDINEQUALITIES,
    COALESCE(SUSTAINABLECITESANDCOMMUNITES, 0) AS SUSTAINABLECITESANDCOMMUNITES,
    COALESCE(RESPONSIBLECONSUMTIONANDPRODUCTION, 0) AS RESPONSIBLECONSUMTIONANDPRODUCTION,
    COALESCE(CLIMATEACTION, 0) AS CLIMATEACTION,
    COALESCE(LIFEBELOWWATER, 0) AS LIFEBELOWWATER,
    COALESCE(LIFEONLAND, 0) AS LIFEONLAND,
    COALESCE(PEACEJUSTICEANDSTRONGINSTITUTIONS, 0) AS PEACEJUSTICEANDSTRONGINSTITUTIONS,
    COALESCE(PARTNERSHIPSFORTHEGOALS, 0) AS PARTNERSHIPSFORTHEGOALS,
    COALESCE(OTHERS, 0) AS OTHERS
FROM
    organizations AS org
        LEFT JOIN
    (SELECT 
        COUNT(*) AS totalSubmited,
            COUNT(CASE
                WHEN cal.sdg = 'NO POVERTY' THEN 1
            END) AS NOPOVERTY,
            COUNT(CASE
                WHEN cal.sdg = 'ZERO HUNGER' THEN 1
            END) AS ZEROHUNGER,
            COUNT(CASE
                WHEN cal.sdg = 'GOOD HEALTH AND WELL-BEING' THEN 1
            END) AS GOODHEALTHANDWELLBEING,
            COUNT(CASE
                WHEN cal.sdg = 'QUALITY EDUCATION' THEN 1
            END) AS QUALITYEDUCATION,
            COUNT(CASE
                WHEN cal.sdg = 'GENDER EQUALITY' THEN 1
            END) AS GENDEREQUALITY,
            COUNT(CASE
                WHEN cal.sdg = 'CLEAN WATER AND SANITATION' THEN 1
            END) AS CLEANWATERANDSANITATION,
            COUNT(CASE
                WHEN cal.sdg = 'AFFORDABLE AND CLEAN ENERGY' THEN 1
            END) AS AFFORDABLEANDCLEANENERGY,
            COUNT(CASE
                WHEN cal.sdg = 'DECENT WORK AND ECONOMIC GROWTH' THEN 1
            END) AS DECENTWORKANDECONOMICGROWTH,
            COUNT(CASE
                WHEN cal.sdg = 'INDUSTRY, INNOVATION AND INFRASTRUCTURE' THEN 1
            END) AS INDUSTRYINNOVATIONANDINFRASTRUCTURE,
            COUNT(CASE
                WHEN cal.sdg = 'REDUCED INEQUALITIES' THEN 1
            END) AS REDUCEDINEQUALITIES,
            COUNT(CASE
                WHEN cal.sdg = 'SUSTAINABLE CITES AND COMMUNITES' THEN 1
            END) AS SUSTAINABLECITESANDCOMMUNITES,
            COUNT(CASE
                WHEN cal.sdg = 'RESPONSIBLE CONSUMTION AND PRODUCTION' THEN 1
            END) AS RESPONSIBLECONSUMTIONANDPRODUCTION,
            COUNT(CASE
                WHEN cal.sdg = 'CLIMATE ACTION' THEN 1
            END) AS CLIMATEACTION,
            COUNT(CASE
                WHEN cal.sdg = 'LIFE BELOW WATER' THEN 1
            END) AS LIFEBELOWWATER,
            COUNT(CASE
                WHEN cal.sdg = 'LIFE ON LAND' THEN 1
            END) AS LIFEONLAND,
            COUNT(CASE
                WHEN cal.sdg = 'PEACE, JUSTICE AND STRONG INSTITUTIONS' THEN 1
            END) AS PEACEJUSTICEANDSTRONGINSTITUTIONS,
            COUNT(CASE
                WHEN cal.sdg = 'PARTNERSHIPS FOR THE GOALS' THEN 1
            END) AS PARTNERSHIPSFORTHEGOALS,
            COUNT(CASE
                WHEN cal.sdg = 'OTHERS' THEN 1
            END) AS OTHERS,
                    org.district
            FROM
                challenge_responses AS cal
            JOIN teams AS t ON cal.team_id = t.team_id
            JOIN mentors AS m ON t.mentor_id = m.mentor_id
            JOIN organizations AS org ON m.organization_code = org.organization_code
            WHERE
                cal.status = 'SUBMITTED'
            GROUP BY org.district) AS t2 ON org.district = t2.district
            ${wherefilter}
        GROUP BY org.district`, { type: QueryTypes.SELECT });
            data = summary;
            if (!data) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (data instanceof Error) {
                throw data
            }
            res.status(200).send(dispatcher(res, data, "success"))
        } catch (err) {
            next(err)
        }
    }
}