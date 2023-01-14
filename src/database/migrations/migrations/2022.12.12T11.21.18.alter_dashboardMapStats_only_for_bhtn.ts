import { Migration } from '../umzug';
import { DataTypes } from 'sequelize';
import { constents } from '../../../configs/constents.config';
import { dashboard_map_stat } from '../../../models/dashboard_map_stat.model';


export const tableName = dashboard_map_stat.tableName;
export const up: Migration = async ({ context: sequelize }) => {
	await sequelize.getQueryInterface().addColumn(tableName, "boys", {
		type: DataTypes.STRING,
		allowNull: false
	})
	await sequelize.getQueryInterface().addColumn(tableName, "girls", {
		type: DataTypes.STRING,
		allowNull: false
	})
	await sequelize.getQueryInterface().addColumn(tableName, "youth_center", {
		type: DataTypes.STRING,
		allowNull: false
	})
};

export const down: Migration = async ({ context: sequelize }) => {
	// 	await sequelize.query(`raise fail('down migration not implemented')`); //call direct sql 
	//or below implementation 
	// await sequelize.getQueryInterface().dropTable(tableName);
	try {
		await sequelize.getQueryInterface().removeColumn(tableName, "boys");
		await sequelize.getQueryInterface().removeColumn(tableName, "girls");
		await sequelize.getQueryInterface().removeColumn(tableName, "youth_center");
	} catch (error) {
		throw error
	}
};