import { DataTypes, Model } from 'sequelize';
import db from '../../config/database.config';

export interface videosAttributes {
    id: number;
    module: string;
    video_id: string;
    status: Enumerator;
}

export class video extends Model<videosAttributes> { }

video.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        module: {
            type: DataTypes.STRING,
            allowNull: false
        },
        video_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        status: {
            type: DataTypes.ENUM('Completed', 'Incomplete')
        }
    },
    {
        sequelize: db,
        tableName: 'video',
    }
);