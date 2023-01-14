import { Migration } from '../umzug';
import { DataTypes } from 'sequelize';
import { constents } from '../../../configs/constents.config';

// you can put some table-specific imports/code here
export const tableName = "organizations";
export const up: Migration = async ({ context: sequelize }) => {
	// await sequelize.query(`raise fail('up migration not implemented')`); //call direct sql 
	//or below implementation 
	await sequelize.getQueryInterface().addColumn(tableName, "organization_type", {
		type: DataTypes.STRING,
		allowNull: true
	});
};

export const down: Migration = async ({ context: sequelize }) => {
	// 	await sequelize.query(`raise fail('down migration not implemented')`); //call direct sql 
	//or below implementation 
	// await sequelize.getQueryInterface().dropTable(tableName);
	try {
		await sequelize.getQueryInterface().removeColumn(tableName, 'organization_type');
	} catch (error) {
		throw error
	}
};